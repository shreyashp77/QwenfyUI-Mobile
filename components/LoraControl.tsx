
import React from 'react';
import { ToggleLeft, ToggleRight, ChevronDown, Trash2 } from 'lucide-react';
import { ThemeColor } from '../types';

interface LoraControlProps {
  label: string;
  enabled?: boolean;
  onToggle?: () => void;
  strength: number;
  onStrengthChange: (val: number) => void;
  readOnly?: boolean; // For the mandatory first LoRA
  
  // Dynamic Selection Props
  availableLoras?: string[];
  selectedLoraName?: string;
  onLoraNameChange?: (name: string) => void;
  onDelete?: () => void;
  theme: ThemeColor;
}

const LoraControl: React.FC<LoraControlProps> = ({
  label,
  enabled = true,
  onToggle,
  strength,
  onStrengthChange,
  readOnly = false,
  availableLoras = [],
  selectedLoraName,
  onLoraNameChange,
  onDelete,
  theme
}) => {
  return (
    <div className={`p-4 rounded-lg border transition-all group ${
        enabled 
        ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800' 
        : 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 opacity-70'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col flex-1 mr-4 min-w-0">
            <span className="font-medium text-gray-700 dark:text-gray-200 text-sm mb-1 truncate">{label}</span>
            
            {!readOnly && availableLoras.length > 0 && onLoraNameChange ? (
                <div className="relative w-full">
                    <select 
                        value={selectedLoraName} 
                        onChange={(e) => onLoraNameChange(e.target.value)}
                        disabled={!enabled}
                        className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 py-1 pl-2 pr-6 appearance-none focus:border-${theme}-500 outline-none truncate transition-colors`}
                    >
                        {availableLoras.map(lora => (
                            <option key={lora} value={lora}>{lora}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
            ) : (
                 <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={selectedLoraName}>
                    {selectedLoraName || "Default LoRA"}
                 </span>
            )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
            {!readOnly && onToggle && (
            <button onClick={onToggle} className={`text-${theme}-500 dark:text-${theme}-400 hover:text-${theme}-600 dark:hover:text-${theme}-300 transition-colors`}>
                {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-400 dark:text-gray-500" />}
            </button>
            )}
            
            {!readOnly && onDelete && (
                <button 
                    onClick={onDelete}
                    className="p-1.5 text-gray-500 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all ml-1"
                    title="Remove LoRA"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
        
        {readOnly && <span className={`text-xs px-2 py-1 bg-${theme}-100 dark:bg-${theme}-900 text-${theme}-700 dark:text-${theme}-200 rounded flex-shrink-0`}>Required</span>}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={strength}
          onChange={(e) => onStrengthChange(parseFloat(e.target.value))}
          disabled={!enabled || readOnly}
          className={`w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${theme}-500`}
        />
        <input
          type="number"
          min="0"
          max="5"
          step="0.1"
          value={strength}
          onChange={(e) => onStrengthChange(parseFloat(e.target.value))}
          disabled={!enabled || readOnly}
          className={`w-16 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-800 dark:text-gray-100 text-center focus:ring-1 focus:ring-${theme}-500 outline-none font-mono`}
        />
      </div>
    </div>
  );
};

export default LoraControl;