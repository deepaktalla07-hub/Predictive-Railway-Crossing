import React, { useState, useEffect, useRef } from 'react';
import { Coordinate } from '@railway-gate/shared';
import { defaultPlacesProvider, PlaceSuggestion } from '../../services/map';
import { MapPin, Navigation, Search, X, Loader2 } from 'lucide-react';

interface PlacesAutocompleteInputProps {
  value: string;
  coordinate: Coordinate;
  onChange: (coord: Coordinate, label: string) => void;
  placeholder: string;
  iconType: 'origin' | 'destination';
  rightElement?: React.ReactNode;
  ariaLabel?: string;
}

export const PlacesAutocompleteInput: React.FC<PlacesAutocompleteInputProps> = ({
  value,
  coordinate,
  onChange,
  placeholder,
  iconType,
  rightElement,
  ariaLabel
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  // Sync internal input value if external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await defaultPlacesProvider.search(query, coordinate);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.warn('Places search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setInputValue(suggestion.description);
    setIsOpen(false);

    // If suggestion already has coordinates from provider, apply immediately
    if (suggestion.coordinate) {
      onChange(suggestion.coordinate, suggestion.description);
      return;
    }

    setIsLoading(true);
    try {
      const details = await defaultPlacesProvider.getDetails(suggestion.placeId);
      if (details?.coordinate) {
        onChange(details.coordinate, suggestion.description);
      } else {
        onChange(coordinate, suggestion.description);
      }
    } catch (err) {
      console.warn('Error fetching place details:', err);
      onChange(coordinate, suggestion.description);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-3 pointer-events-none">
          {iconType === 'origin' ? (
            <MapPin className="w-4 h-4 text-cyan-400" />
          ) : (
            <Navigation className="w-4 h-4 text-emerald-400" />
          )}
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder}
          className={`w-full pl-9 ${
            rightElement ? 'pr-16' : 'pr-8'
          } py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner ${
            iconType === 'origin'
              ? 'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
              : 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
          }`}
        />

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          ) : inputValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
              title="Clear input"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}

          {rightElement}
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown - Fully Opaque */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[100] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800 text-xs">
          {suggestions.map((item, idx) => (
            <div
              key={item.placeId}
              onClick={() => handleSelectSuggestion(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`p-3 cursor-pointer flex items-center gap-2.5 transition-colors bg-slate-900 ${
                selectedIndex === idx ? '!bg-blue-600 text-white' : 'hover:!bg-slate-800 text-slate-200'
              }`}
            >
              <Search className={`w-3.5 h-3.5 flex-shrink-0 ${selectedIndex === idx ? 'text-white' : 'text-slate-400'}`} />
              <div className="flex flex-col truncate">
                <span className={`font-bold truncate ${selectedIndex === idx ? 'text-white' : 'text-slate-100'}`}>
                  {item.mainText}
                </span>
                {item.secondaryText && (
                  <span className={`text-[11px] truncate ${selectedIndex === idx ? 'text-blue-100' : 'text-slate-400'}`}>
                    {item.secondaryText}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
