import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface OptionGroup {
  label: string;
  options: { value: string; label: string }[];
}

interface MultiSelectSearchProps {
  groups: OptionGroup[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const MultiSelectSearch: React.FC<MultiSelectSearchProps> = ({ groups, values, onChange, placeholder = "Wybierz opcje..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const removeValue = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter(v => v !== val));
  };

  // Znajdź etykiety wybranych elementów dla kafelków
  const selectedOptions = values.map(val => {
    const found = groups.flatMap(g => g.options).find(o => o.value === val);
    return found ? { value: val, label: found.label } : { value: val, label: val };
  });

  // Inteligentne filtrowanie i sortowanie grup (trafność - od początku słowa)
  const filteredGroups = groups.map(group => {
    const q = search.toLowerCase();
    let filteredOptions = group.options;
    
    if (q) {
      filteredOptions = group.options.filter(opt => opt.label.toLowerCase().includes(q));
      
      // Sortowanie - te z dopasowaniem na początku lądują wyżej
      filteredOptions.sort((a, b) => {
        const aIndex = a.label.toLowerCase().indexOf(q);
        const bIndex = b.label.toLowerCase().indexOf(q);
        return aIndex - bIndex;
      });
    }

    return {
      ...group,
      options: filteredOptions
    };
  }).filter(group => group.options.length > 0);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className="w-full bg-[#3a3a40] text-white border border-[#4a4a50] rounded-xl px-3 py-2 min-h-[48px] appearance-none focus:outline-none focus:border-primary flex items-center flex-wrap gap-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOptions.length === 0 && (
          <span className="text-gray-400 pl-1">{placeholder}</span>
        )}
        
        {selectedOptions.map(opt => (
          <div key={opt.value} className="bg-[#2a2a30] border border-[#5a5a60] rounded-md px-2 py-1 flex items-center gap-1 text-sm">
            <span className="truncate max-w-[150px]" title={opt.label}>{opt.label.split(' (')[0]}</span>
            <X size={14} className="text-gray-400 hover:text-red-400 cursor-pointer ml-1" onClick={(e) => removeValue(opt.value, e)} />
          </div>
        ))}
        
        <div className="ml-auto pl-2">
          <ChevronDown className="text-gray-400" size={18} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#2a2a30] border border-[#4a4a50] rounded-xl shadow-xl overflow-hidden">
          <div className="p-3 border-b border-[#4a4a50] flex items-center bg-[#3a3a40]">
            <Search size={16} className="text-gray-400 mr-2" />
            <input 
              type="text"
              autoFocus
              className="bg-transparent border-none text-white w-full focus:outline-none"
              placeholder="Szukaj (np. jan kowalski)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <X size={16} className="text-gray-400 cursor-pointer ml-2 hover:text-white" onClick={() => setSearch('')} />
            )}
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {filteredGroups.length === 0 ? (
              <div className="p-3 text-gray-400 text-sm text-center">Brak wyników</div>
            ) : (
              filteredGroups.map(group => (
                <div key={group.label} className="mb-2">
                  <div className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">{group.label}</div>
                  {group.options.map(opt => {
                    const isSelected = values.includes(opt.value);
                    return (
                      <div 
                        key={opt.value}
                        className={`px-3 py-2 rounded-lg cursor-pointer text-sm mb-1 flex justify-between items-center \${isSelected ? 'bg-primary/20 text-white' : 'text-gray-200 hover:bg-[#3a3a40]'}`}
                        onClick={() => toggleOption(opt.value)}
                      >
                        <span className="pr-4">{opt.label}</span>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
