'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { LocationData } from '@/types';

interface LocationPickerProps {
  value: LocationData | null;
  onChange: (location: LocationData) => void;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const searchBoxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found');
      return;
    }

    if (!mapRef.current) return;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(() => {
      if (!mapRef.current) return;

      const initialCenter = value || { lat: 40.7128, lng: -74.006, name: 'New York' };
      
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: initialCenter.lat, lng: initialCenter.lng },
        zoom: 13,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry',
            stylers: [{ color: '#1a1a1a' }],
          },
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f5f5f7' }],
          },
          {
            featureType: 'all',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#000000' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#2c3e50' }],
          },
        ],
      });

      setMap(mapInstance);

      // Add marker
      const markerInstance = new google.maps.Marker({
        map: mapInstance,
        position: { lat: initialCenter.lat, lng: initialCenter.lng },
        draggable: true,
      });

      setMarker(markerInstance);

      // Handle marker drag
      markerInstance.addListener('dragend', () => {
        const position = markerInstance.getPosition();
        if (position) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: position }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              onChange({
                lat: position.lat(),
                lng: position.lng(),
                name: results[0].formatted_address?.split(',')[0] || '',
                address: results[0].formatted_address || '',
              });
            }
          });
        }
      });

      // Setup search box
      if (searchBoxRef.current) {
        const searchBox = new google.maps.places.SearchBox(searchBoxRef.current);
        
        searchBox.addListener('places_changed', () => {
          const places = searchBox.getPlaces();
          if (!places || places.length === 0) return;

          const place = places[0];
          if (!place || !place.geometry || !place.geometry.location) return;

          const location = place.geometry.location;
          mapInstance.setCenter(location);
          markerInstance.setPosition(location);

          onChange({
            lat: location.lat(),
            lng: location.lng(),
            name: place.name || '',
            address: place.formatted_address || '',
          });
        });
      }
    });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-400">
          Location
        </label>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isExpanded ? 'Collapse Map' : 'Expand Map'}
        </button>
      </div>

      {/* Search Input */}
      <input
        ref={searchBoxRef}
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search for a place..."
        className="w-full px-4 md:px-6 py-3 md:py-4 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors text-base md:text-lg"
      />

      {/* Selected Location Display */}
      {value && (
        <div className="px-4 py-3 bg-black/40 rounded-xl border border-white/10">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-400 mt-0.5 flex-shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium">{value.name}</p>
              {value.address && (
                <p className="text-sm text-gray-400 mt-0.5">{value.address}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        className={`w-full rounded-xl overflow-hidden border border-white/10 transition-all ${
          isExpanded ? 'h-96' : 'h-64'
        }`}
      />
    </div>
  );
}
