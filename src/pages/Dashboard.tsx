import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import type { Card } from '../types';

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredCards = cards.filter(card => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (card.player_name && card.player_name.toLowerCase().includes(searchLower)) ||
            (card.card_set && card.card_set.toLowerCase().includes(searchLower)) ||
            (card.card_type && card.card_type.toLowerCase().includes(searchLower)) ||
            (card.notes && card.notes.toLowerCase().includes(searchLower)) ||
            (card.year && card.year.toString().includes(searchLower)) ||
            (card.grading_company && card.grading_company.toLowerCase().includes(searchLower)) ||
            (card.name && card.name.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <h1 className="text-xl font-bold text-foreground">Card Collection</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-hidden sm:inline-block text-muted-foreground">{user?.email}</span>
                        <Button variant="outline" size="sm" onClick={signOut}>
                            Sign out
                        </Button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold text-foreground">My Collection</h2>
                    <div className="flex w-full sm:w-auto items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Search cards..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Link to="/add-card">
                            <Button>Add Card</Button>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : filteredCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center shadow-sm">
                        <h3 className="text-lg font-semibold text-foreground">No cards found</h3>
                        <p className="mt-2 text-muted-foreground">
                            {searchTerm ? "No cards match your search." : "Your collection is empty. Start adding cards!"}
                        </p>
                        <div className="mt-6">
                            <Link to="/add-card">
                                <Button>Add Card</Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                                    <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
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
                                        <h3 className="truncate font-semibold text-foreground">{displayTitle}</h3>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="truncate text-xs text-muted-foreground max-w-[60%]">{displaySubtitle}</p>
                                            <span className="text-xs font-medium text-accent-foreground px-1.5 py-0.5 rounded bg-accent/10">
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
    );
}
