import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface OptionGroup {
  label: string;
  options: { value: string; label: string }[];
}

interface SearchableSelectProps {
  groups: OptionGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ groups, value, onChange, placeholder = "Wybierz opcję..." }) => {
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

  const filteredGroups = groups.map(group => ({
    ...group,
    options: group.options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
  })).filter(group => group.options.length > 0);

  const selectedOption = groups.flatMap(g => g.options).find(o => o.value === value);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className="w-full bg-[#3a3a40] text-white border border-[#4a4a50] rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-primary flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="text-gray-400" size={18} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#2a2a30] border border-[#4a4a50] rounded-xl shadow-xl overflow-hidden">
          <div className="p-3 border-b border-[#4a4a50] flex items-center bg-[#3a3a40]">
            <Search size={16} className="text-gray-400 mr-2" />
            <input 
              type="text"
              autoFocus
              className="bg-transparent border-none text-white w-full focus:outline-none"
              placeholder="Szukaj..."
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
                  {group.options.map(opt => (
                    <div 
                      key={opt.value}
                      className={`px-3 py-2 rounded-lg cursor-pointer text-sm \${opt.value === value ? 'bg-primary text-white font-medium' : 'text-gray-200 hover:bg-[#3a3a40]'}`}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearch("");
                      }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
