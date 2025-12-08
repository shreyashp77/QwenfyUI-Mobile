
import React from 'react';
import { Cpu, ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    availableModels: string[];
    theme: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
    selectedModel,
    setSelectedModel,
    availableModels,
    theme
}) => {
    return (
        <div className="bg-white dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors duration-300 shadow-sm">
            <label className="block text-xs font-medium text-gray-500 mb-2">Model</label>
            <div className="relative">
                <Cpu size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-200 py-2 pl-8 pr-8 appearance-none focus:border-${theme}-500 outline-none transition-colors`}
                >
                    {availableModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
        </div>
    );
};

export default ModelSelector;
