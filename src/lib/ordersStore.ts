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
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const getCommandOrders = (): CommandOrder[] => readLocal();

export const getPendingOrders = (): CommandOrder[] => 
  readLocal().filter(o => o.status === 'PENDING');

export const addCommandOrder = (order: CommandOrder): CommandOrder[] => {
  const current = readLocal();
  const next = [order, ...current];
  writeLocal(next);
  return next;
};

export const acknowledgeOrder = (
  orderId: string, 
  officerBadge: string
): CommandOrder[] => {
  const current = readLocal();
  const updated = current.map(order => 
    order.id === orderId 
      ? {
          ...order,
          status: 'ACKNOWLEDGED' as const,
          acknowledgedBy: officerBadge,
          acknowledgedAt: new Date().toISOString(),
        }
      : order
  );
  writeLocal(updated);
  return updated;
};

export const cancelOrder = (
  orderId: string,
  cancellationReason: string
): CommandOrder[] => {
  const current = readLocal();
  const updated = current.map(order =>
    order.id === orderId
      ? {
          ...order,
          status: 'CANCELLED' as const,
          cancellationReason,
        }
      : order
  );
  writeLocal(updated);
  return updated;
};

export const onCommandOrdersUpdated = (handler: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const listener = () => handler();
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
};