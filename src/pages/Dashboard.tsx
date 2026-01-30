import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { FilterSidebar } from '../components/FilterSidebar';
import type { Card } from '../types';
import { Filter, X } from 'lucide-react';

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchCards();
        }
    }, [user]);

    const fetchCards = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            if (data) {
                setCards(data);
            }
        } catch (error) {
            console.error('Error fetching cards:', error);
        } finally {
            setLoading(false);
        }
    };

    // Extract Filter Options
    const filterGroups = useMemo(() => {
        const groups = [
            { key: 'player_name', label: 'Player' },
            { key: 'year', label: 'Year' },
            { key: 'card_set', label: 'Set' },
            { key: 'card_type', label: 'Type' },
            { key: 'grading_company', label: 'Grader' },
            { key: 'condition', label: 'Condition' },
        ];

        return groups.map(group => {
            const counts: Record<string, number> = {};
            cards.forEach(card => {
                const val = (card as any)[group.key];
                if (val !== null && val !== undefined && val !== '') {
                    const strVal = String(val).toLowerCase();
                    counts[strVal] = (counts[strVal] || 0) + 1;
                }
            });

            const options = Object.entries(counts)
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => {
                    if (group.key === 'year') {
                        return b.value.localeCompare(a.value, undefined, { numeric: true });
                    }
                    return a.value.localeCompare(b.value);
                });

            return {
                key: group.key,
                label: group.label,
                options
            };
        }).filter(g => g.options.length > 0);
    }, [cards]);

    const handleFilterChange = (groupKey: string, value: string) => {
        setSelectedFilters(prev => {
            const groupValues = prev[groupKey] || [];
            const newValues = groupValues.includes(value)
                ? groupValues.filter(v => v !== value)
                : [...groupValues, value];

            // Cleanup empty keys
            if (newValues.length === 0) {
                const { [groupKey]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [groupKey]: newValues };
        });
    };

    const clearAllFilters = () => setSelectedFilters({});

    const removeFilter = (key: string, value: string) => {
        handleFilterChange(key, value);
    };

    const filteredCards = cards.filter(card => {
        const searchLower = searchTerm.toLowerCase();

        // 1. Text Search
        const matchesSearch = (
            (card.player_name && card.player_name.toLowerCase().includes(searchLower)) ||
            (card.card_set && card.card_set.toLowerCase().includes(searchLower)) ||
            (card.card_type && card.card_type.toLowerCase().includes(searchLower)) ||
            (card.notes && card.notes.toLowerCase().includes(searchLower)) ||
            (card.year && card.year.toString().includes(searchLower)) ||
            (card.grading_company && card.grading_company.toLowerCase().includes(searchLower)) ||
            (card.name && card.name.toLowerCase().includes(searchLower))
        );

        if (!matchesSearch) return false;

        // 2. Attribute Filters
        for (const [key, selectedValues] of Object.entries(selectedFilters)) {
            if (selectedValues.length > 0) {
                const cardVal = String((card as any)[key] || '').toLowerCase();
                // Check if card matches ANY of the selected values for this category (OR logic)
                if (!selectedValues.includes(cardVal)) {
                    return false;
                }
            }
        }

        return true;
    });

    const activeFilterCount = Object.values(selectedFilters).reduce((acc, curr) => acc + curr.length, 0);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b border-border bg-card sticky top-0 z-30">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <h1 className="text-xl font-bold text-foreground">Card Collection</h1>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:inline-block text-sm text-muted-foreground">{user?.email}</span>
                        <Button variant="outline" size="sm" onClick={signOut}>
                            Sign out
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 mx-auto w-full max-w-7xl">
                {/* Sidebar */}
                <FilterSidebar
                    filterGroups={filterGroups}
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onClearAll={clearAllFilters}
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                />

                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 w-full overflow-hidden">
                    {/* Controls Header */}
                    <div className="mb-6 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                className="lg:hidden shrink-0"
                                onClick={() => setIsFilterOpen(true)}
                            >
                                <Filter className="mr-2 h-4 w-4" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>

                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search cards..."
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <Link to="/add-card" className="shrink-0">
                                <Button>
                                    <span className="hidden sm:inline">Add Card</span>
                                    <span className="sm:hidden">+</span>
                                </Button>
                            </Link>
                        </div>

                        {/* Active Filter Chips */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm text-muted-foreground mr-2">Filters:</span>
                                {Object.entries(selectedFilters).map(([key, values]) => (
                                    values.map(value => (
                                        <span
                                            key={`${key}-${value}`}
                                            className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground"
                                        >
                                            {/* Label mapping could be improved but using key for now */}
                                            <span className="opacity-50 mr-1 capitalize">{key.replace('_', ' ')}:</span>
                                            {value}
                                            <button
                                                onClick={() => removeFilter(key, value)}
                                                className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-3 w-3" />
                                                <span className="sr-only">Remove</span>
                                            </button>
                                        </span>
                                    ))
                                ))}
                                <button
                                    onClick={clearAllFilters}
                                    className="text-xs text-muted-foreground hover:text-primary underline ml-2"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        </div>
                    ) : filteredCards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center shadow-sm">
                            <h3 className="text-lg font-semibold text-foreground">No cards found</h3>
                            <p className="mt-2 text-muted-foreground">
                                {searchTerm || activeFilterCount > 0
                                    ? "No cards match your current search or filters."
                                    : "Your collection is empty. Start adding cards!"}
                            </p>
                            <div className="mt-6 flex gap-4">
                                {(searchTerm || activeFilterCount > 0) && (
                                    <Button variant="outline" onClick={() => { setSearchTerm(''); clearAllFilters(); }}>
                                        Clear Search & Filters
                                    </Button>
                                )}
                                <Link to="/add-card">
                                    <Button>Add Card</Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {filteredCards.map((card) => {
                                // Determine display image: use first in array, fallback to old image_url
                                const displayImage = (card.image_urls && card.image_urls.length > 0)
                                    ? card.image_urls[0]
                                    : card.image_url;

                                // Display details: Player Name + Year OR Name
                                const displayTitle = card.player_name ? `${card.year || ''} ${card.player_name}` : card.name;
                                const displaySubtitle = card.card_set || card.set_name;

                                return (
                                    <Link key={card.id} to={`/card/${card.id}`} className="group block overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary hover:shadow-md">
                                        <div className="aspect-[3/4] w-full overflow-hidden bg-muted relative">
                                            {displayImage ? (
                                                <img
                                                    src={displayImage}
                                                    alt={displayTitle}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h3 className="truncate font-semibold text-foreground text-sm">{displayTitle}</h3>
                                            <div className="flex justify-between items-center mt-1 gap-2">
                                                <p className="truncate text-xs text-muted-foreground">{displaySubtitle}</p>
                                                <span className="shrink-0 text-[10px] font-medium text-accent-foreground px-1.5 py-0.5 rounded bg-accent/10 whitespace-nowrap">
                                                    {card.grading_company && card.grading_company !== 'Raw'
                                                        ? `${card.grading_company} ${card.grade_value}`
                                                        : card.condition}
                                                </span>
                                            </div>
                                            {card.price && (
                                                <p className="mt-2 text-sm font-bold text-primary">${card.price}</p>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
