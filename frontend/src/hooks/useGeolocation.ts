import { useState, useCallback, useEffect, useRef } from 'react';
import { Coordinate } from '@railway-gate/shared';

export interface GpsPositionData {
  coordinate: Coordinate;
  heading: number | null;
  speedKmh: number | null;
  accuracyMeters: number | null;
  timestamp: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [gpsData, setGpsData] = useState<GpsPositionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setLocation(coord);
        setGpsData({
          coordinate: coord,
          heading: pos.coords.heading || null,
          speedKmh: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : null,
          accuracyMeters: pos.coords.accuracy,
          timestamp: pos.timestamp
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device');
      return;
    }

    if (watchIdRef.current !== null) return;

    setIsWatching(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coord = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setLocation(coord);
        setGpsData({
          coordinate: coord,
          heading: pos.coords.heading || null,
          speedKmh: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : null,
          accuracyMeters: pos.coords.accuracy,
          timestamp: pos.timestamp
        });
      },
      (err) => {
        console.warn('[useGeolocation] GPS watch warning:', err.message);
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    location,
    gpsData,
    error,
    loading,
    isWatching,
    getCurrentLocation,
    startWatching,
    stopWatching
  };
}
