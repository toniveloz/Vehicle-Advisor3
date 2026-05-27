import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown } from "lucide-react";

interface ZipCodeAutocompleteProps {
  value: string;
  onChange: (zip: string, city: string, state: string) => void;
  placeholder?: string;
  label?: string;
}

export function ZipCodeAutocomplete({
  value,
  onChange,
  placeholder = "Ingresa ZIP code, ciudad o estado",
  label = "ZIP Code",
}: ZipCodeAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Array<{ zip: string; city: string; state: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Llamar a la API de búsqueda de ZIP codes
  const searchQuery = trpc.logistics.searchZipCodes.useQuery(
    { query: inputValue },
    { enabled: inputValue.length > 0 }
  );

  useEffect(() => {
    if (searchQuery.data) {
      setSuggestions(searchQuery.data);
      setIsOpen(true);
    }
  }, [searchQuery.data]);

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (newValue.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelectSuggestion = (zip: string, city: string, state: string) => {
    setInputValue(zip);
    onChange(zip, city, state);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
        />
        {inputValue.length > 0 && (
          <ChevronDown
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggestion(suggestion.zip, suggestion.city, suggestion.state)}
              className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors text-slate-300 hover:text-cyan-400 border-b border-slate-700 last:border-b-0"
            >
              <div className="font-mono text-sm">{suggestion.zip}</div>
              <div className="text-xs text-slate-500">
                {suggestion.city}, {suggestion.state}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && inputValue.length > 0 && suggestions.length === 0 && !searchQuery.isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 p-4 text-center text-slate-500 text-sm">
          No se encontraron resultados
        </div>
      )}

      {searchQuery.isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 p-4 text-center text-slate-500 text-sm">
          Buscando...
        </div>
      )}
    </div>
  );
}
