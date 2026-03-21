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
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const successMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    setSubmitSuccessMessage('Report submitted successfully!');
    if (successMessageTimerRef.current) {
      clearTimeout(successMessageTimerRef.current);
    }
    successMessageTimerRef.current = setTimeout(() => {
      setSubmitSuccessMessage('');
      successMessageTimerRef.current = null;
    }, 2600);
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
      if (successMessageTimerRef.current) {
        clearTimeout(successMessageTimerRef.current);
      }
      stopCamera();
    };
  }, []);

  return (
    <div className="landing-report-page">
      {submitSuccessMessage && (
        <div className="landing-submit-toast">
          {submitSuccessMessage}
        </div>
      )}
      <div className="landing-top-actions">
        <button
          onClick={() => navigate('/regional')}
          className="landing-top-btn"
        >
          Login as Regional Officer
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="landing-top-btn"
        >
          Login as Command Center
        </button>
      </div>
      <div className="landing-form-shell">
        <div className="landing-form-card">
          <h1 className="landing-form-title">Report an Accident</h1>
          <p className="landing-form-subtitle">Fast lane reporting for real-world incidents. Fill key details and dispatch faster.</p>
          <form className="landing-form" onSubmit={handleSubmit}>
            <div className="landing-field">
              <label className="landing-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="landing-input"
              />
            </div>
            <div className="landing-field">
              <label className="landing-label">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="landing-input"
              />
            </div>
            <div className="landing-field">
              <label className="landing-label">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="landing-input"
              />
            </div>
            <div className="landing-field">
              <label className="landing-label">AccidentPoint</label>
              <div className="landing-point-row">
                <input
                  type="text"
                  value={accidentPoint}
                  onChange={(e) => setAccidentPoint(e.target.value)}
                  required
                  placeholder={isLocating ? 'Fetching current location...' : 'Lat 23.215000, Lng 72.637000'}
                  className="landing-input"
                />
                <button
                  type="button"
                  onClick={requestCurrentLocation}
                  disabled={isLocating}
                  className="landing-secondary-btn"
                >
                  {isLocating ? 'Locating...' : 'Use My Location'}
                </button>
              </div>
              {(isLocating || locationError) && (
                <div className={`landing-help ${locationError ? 'error' : ''}`}>
                  {locationError || 'Getting your current location...'}
                </div>
              )}
              {!isLocating && !locationError && (
                <div className="landing-help">You can edit AccidentPoint manually in the same format: Lat xx.xxxxxx, Lng yy.yyyyyy</div>
              )}
            </div>
            <div className="landing-field">
              <label className="landing-label">Type of Accident</label>
              <div className="landing-radio-row">
                <label className="landing-radio-option">
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
                <label className="landing-radio-option">
                  <input
                    type="radio"
                    name="accidentType"
                    value="Medium"
                    checked={accidentType === 'Medium'}
                    onChange={() => setAccidentType('Medium')}
                  />
                  Medium
                </label>
                <label className="landing-radio-option">
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
            <div className="landing-field">
              <label className="landing-label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="landing-input landing-textarea"
              />
            </div>
            <div className="landing-field">
              <label className="landing-label">Photo</label>
              <div className="landing-photo-row">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="landing-photo-btn"
                >
                  Upload Photo
                </button>
                <button
                  type="button"
                  onClick={openCamera}
                  className="landing-photo-btn"
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
              <div className={`landing-photo-meta ${image ? 'selected' : ''}`}>
                {image ? `Selected: ${image.name}` : 'No photo selected yet'}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="landing-submit-btn"
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