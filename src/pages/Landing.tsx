import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addUserReport, type UserAccidentType } from '../lib/reportDatabase';

export default function Landing() {
  const MAX_UPLOAD_SIDE = 1280;
  const UPLOAD_QUALITY = 0.78;

  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [accidentPoint, setAccidentPoint] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [accidentType, setAccidentType] = useState<UserAccidentType>('Minor');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatCoords = (latitude: number, longitude: number) =>
    `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`;

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services are not supported in this browser.');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = formatCoords(position.coords.latitude, position.coords.longitude);
        setAccidentPoint(coords);
        setIsLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Please allow it to capture AccidentPoint.'
            : 'Unable to get your current location. Please try again.';
        setLocationError(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  };

  const fileToCompressedDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        const maxDimension = Math.max(img.width, img.height);
        const scale = maxDimension > MAX_UPLOAD_SIDE ? MAX_UPLOAD_SIDE / maxDimension : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Unable to process selected image.'));
          return;
        }

        context.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', UPLOAD_QUALITY));
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to read selected image.'));
      };

      img.src = objectUrl;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      alert('Please upload an image before submitting.');
      return;
    }

    if (!accidentPoint) {
      alert('AccidentPoint is required. Please allow location access and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const imageDataUrl = await fileToCompressedDataUrl(image);
      await addUserReport({
        name,
        phoneNumber,
        location,
        accidentPoint,
        accidentType,
        description,
        imageDataUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit report. Please try again.';
      alert(message);
      setIsSubmitting(false);
      return;
    }

    alert('Report submitted successfully!');
    // Reset form
    setName('');
    setPhoneNumber('');
    setLocation('');
    setAccidentPoint('');
    requestCurrentLocation();
    setAccidentType('Minor');
    setDescription('');
    setImage(null);
    setIsSubmitting(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      alert('Unable to access camera. Please check browser permissions.');
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera is not ready yet. Please try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      alert('Unable to capture image.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Unable to capture image.');
        return;
      }
      const capturedFile = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setImage(capturedFile);
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  useEffect(() => {
    requestCurrentLocation();

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '10px' }}>
        <button
          onClick={() => navigate('/regional')}
          style={{
            padding: '8px 16px',
            background: 'var(--accent-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Login as Regional Officer
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 16px',
            background: 'var(--accent-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Login as Command Center
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%', padding: '20px', background: 'var(--bg-surface)', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-primary)' }}>Report an Accident</h1>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-default)', borderRadius: '4px', fontFamily: 'Merriweather, serif' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-default)', borderRadius: '4px', fontFamily: 'Merriweather, serif' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-default)', borderRadius: '4px', fontFamily: 'Merriweather, serif' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>AccidentPoint</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={accidentPoint}
                  readOnly
                  required
                  placeholder={isLocating ? 'Fetching current location...' : 'Automatic GPS accident point'}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border-default)', borderRadius: '4px', fontFamily: 'Merriweather, serif' }}
                />
                <button
                  type="button"
                  onClick={requestCurrentLocation}
                  disabled={isLocating}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '0 12px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '4px',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    cursor: isLocating ? 'not-allowed' : 'pointer',
                    fontFamily: 'Merriweather, serif',
                  }}
                >
                  {isLocating ? 'Locating...' : 'Use My Location'}
                </button>
              </div>
              {(isLocating || locationError) && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: locationError ? '#d43f3a' : 'var(--text-secondary)' }}>
                  {locationError || 'Getting your current location...'}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Type of Accident</label>
              <div style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="accidentType"
                    value="Minor"
                    checked={accidentType === 'Minor'}
                    onChange={() => setAccidentType('Minor')}
                    required
                  />
                  Minor
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="accidentType"
                    value="Medium"
                    checked={accidentType === 'Medium'}
                    onChange={() => setAccidentType('Medium')}
                  />
                  Medium
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="accidentType"
                    value="Extreme"
                    checked={accidentType === 'Extreme'}
                    onChange={() => setAccidentType('Extreme')}
                  />
                  Extreme
                </label>
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-default)', borderRadius: '4px', fontFamily: 'Merriweather, serif' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Photo</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '4px',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'Merriweather, serif',
                  }}
                >
                  Upload Photo
                </button>
                <button
                  type="button"
                  onClick={openCamera}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid var(--border-default)',
                    borderRadius: '4px',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'Merriweather, serif',
                  }}
                >
                  Take Photo
                </button>
              </div>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {image ? `Selected: ${image.name}` : 'No photo selected yet'}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                background: isSubmitting ? '#7a8299' : 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontFamily: 'Merriweather, serif',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>
      </div>
      {cameraOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
          onClick={closeCamera}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--bg-surface)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--border-default)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>Take Photo</div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-default)', background: '#000' }}
            />
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={capturePhoto}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'Merriweather, serif',
                }}
              >
                Capture
              </button>
              <button
                type="button"
                onClick={closeCamera}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#7a8299',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'Merriweather, serif',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}