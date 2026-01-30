
import { X, Filter, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Button } from './Button';
import { useState } from 'react';

export type FilterGroup = {
    key: string;
    label: string;
    options: { value: string; count: number }[];
};

interface FilterSidebarProps {
    filterGroups: FilterGroup[];
    selectedFilters: Record<string, string[]>;
    onFilterChange: (groupKey: string, value: string) => void;
    onClearAll: () => void;
    isOpen: boolean;
    onClose: () => void;
}

export function FilterSidebar({
    filterGroups,
    selectedFilters,
    onFilterChange,
    onClearAll,
    isOpen,
    onClose,
}: FilterSidebarProps) {
    // Mobile responsive classes
    const sidebarClasses = isOpen
        ? "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-lg transform transition-transform duration-200 ease-in-out px-4 py-6"
        : "hidden lg:block lg:w-64 lg:shrink-0 lg:border-r lg:border-border lg:bg-card/50 px-4 py-6";

    // State for collapsed sections (default all open)
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={sidebarClasses}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="flex items-center gap-2 font-semibold">
                        <Filter className="h-4 w-4" />
                        Filters
                    </h3>
                    <div className="flex items-center gap-2">
                        {Object.values(selectedFilters).some(arr => arr.length > 0) && (
                            <button
                                onClick={onClearAll}
                                className="text-xs text-primary hover:underline font-medium"
                            >
                                Clear All
                            </button>
                        )}
                        <button onClick={onClose} className="lg:hidden p-1 hover:bg-accent rounded">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-6 h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar">
                    {filterGroups.map((group) => {
                        const isCollapsed = collapsedSections[group.key];
                        const selectedValues = selectedFilters[group.key] || [];

                        return (
                            <div key={group.key} className="border-b border-border/50 pb-4 last:border-0">
                                <button
                                    className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors"
                                    onClick={() => toggleSection(group.key)}
                                >
                                    <span>{group.label}</span>
                                    {isCollapsed ? (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>

                                {!isCollapsed && (
                                    <div className="mt-2 space-y-1.5">
                                        {group.options.map((option) => {
                                            const isSelected = selectedValues.includes(option.value);
                                            return (
                                                <label
                                                    key={option.value}
                                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer select-none group"
                                                >
                                                    <div
                                                        className={`
                                                            flex h-4 w-4 items-center justify-center rounded border transition-colors
                                                            ${isSelected
                                                                ? 'border-primary bg-primary text-primary-foreground'
                                                                : 'border-input bg-background group-hover:border-primary/50'
                                                            }
                                                        `}
                                                    >
                                                        {isSelected && <Check className="h-3 w-3" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={isSelected}
                                                        onChange={() => onFilterChange(group.key, option.value)}
                                                    />
                                                    <span className="flex-1 truncate">{option.value}</span>
                                                    <span className="text-xs text-muted-foreground/50">{option.count}</span>
                                                </label>
                                            );
                                        })}
                                        {group.options.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic pl-6">No options</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}
