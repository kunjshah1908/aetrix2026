export interface CommandOrder {
  id: string;
  timestamp: string;
  decisionType: string;
  incidentId: string;
  summary: string;
  operator: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'CANCELLED';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  cancellationReason?: string;
}

const STORAGE_KEY = 'aetrix.commandOrders.v1';
const EVENT_NAME = 'command-orders-updated';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_ROOT = API_BASE_URL || '';

const canUseLocalFallback = () =>
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

const notifyOrdersUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

const apiUrl = (path: string) => `${API_ROOT}${path}`;

const readApiErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const text = (await response.text()).trim();
    if (!text) return fallback;

    try {
      const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
      if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error;
      if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
    } catch {
      // Response was plain text.
    }

    return text;
  } catch {
    return fallback;
  }
};

const readLocal = (): CommandOrder[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const writeLocal = (orders: CommandOrder[]) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  notifyOrdersUpdated();
};

export const getCommandOrders = async (): Promise<CommandOrder[]> => {
  try {
    const response = await fetch(apiUrl('/api/orders'));
    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, `Unable to load command orders (HTTP ${response.status})`));
    }

    const orders = (await response.json()) as CommandOrder[];
    if (canUseLocalFallback()) {
      writeLocal(orders);
    }
    return orders;
  } catch (error) {
    if (!canUseLocalFallback()) {
      throw error;
    }
    return readLocal();
  }
};

export const getPendingOrders = async (): Promise<CommandOrder[]> =>
  (await getCommandOrders()).filter((order) => order.status === 'PENDING');

export const addCommandOrder = async (order: CommandOrder): Promise<CommandOrder[]> => {
  try {
    const response = await fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, `Unable to create command order (HTTP ${response.status})`));
    }

    const orders = await getCommandOrders();
    notifyOrdersUpdated();
    return orders;
  } catch (error) {
    if (!canUseLocalFallback()) {
      throw error;
    }

    const current = readLocal();
    const next = [order, ...current];
    writeLocal(next);
    return next;
  }
};

export const acknowledgeOrder = (
  orderId: string, 
  officerBadge: string
): Promise<CommandOrder[]> => {
  const acknowledgedAt = new Date().toISOString();

  return updateOrderStatus(orderId, {
    status: 'ACKNOWLEDGED',
    acknowledgedBy: officerBadge,
    acknowledgedAt,
  });
};

export const cancelOrder = (
  orderId: string,
  cancellationReason: string
): Promise<CommandOrder[]> => {
  return updateOrderStatus(orderId, {
    status: 'CANCELLED',
    cancellationReason,
  });
};

const updateOrderStatus = async (
  orderId: string,
  payload: {
    status: 'ACKNOWLEDGED' | 'CANCELLED';
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    cancellationReason?: string;
  }
): Promise<CommandOrder[]> => {
  try {
    const response = await fetch(apiUrl(`/api/orders/${encodeURIComponent(orderId)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, `Unable to update command order (HTTP ${response.status})`));
    }

    const orders = await getCommandOrders();
    notifyOrdersUpdated();
    return orders;
  } catch (error) {
    if (!canUseLocalFallback()) {
      throw error;
    }

    const current = readLocal();
    const updated = current.map((order) => {
      if (order.id !== orderId) return order;

      if (payload.status === 'ACKNOWLEDGED') {
        return {
          ...order,
          status: 'ACKNOWLEDGED' as const,
          acknowledgedBy: payload.acknowledgedBy,
          acknowledgedAt: payload.acknowledgedAt,
          cancellationReason: undefined,
        };
      }

      return {
        ...order,
        status: 'CANCELLED' as const,
        cancellationReason: payload.cancellationReason,
      };
    });

    writeLocal(updated);
    return updated;
  }
};

export const onCommandOrdersUpdated = (handler: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const customEventListener = () => handler();
  const storageListener = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      handler();
    }
  };

  window.addEventListener(EVENT_NAME, customEventListener);
  window.addEventListener('storage', storageListener);

  return () => {
    window.removeEventListener(EVENT_NAME, customEventListener);
    window.removeEventListener('storage', storageListener);
  };
};