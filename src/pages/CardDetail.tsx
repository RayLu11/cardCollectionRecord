import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { ArrowLeft, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Card } from '../types';

export default function CardDetail() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [card, setCard] = useState<Card | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    // Image Gallery State
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (id && user) {
            fetchCard();
        }
    }, [id, user]);

    const fetchCard = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .eq('id', id)
                .eq('user_id', user?.id)
                .single();

            if (error) throw error;
            setCard(data);
        } catch (error) {
            console.error('Error fetching card:', error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this card?')) return;

        try {
            setDeleting(true);
            const { error } = await supabase
                .from('cards')
                .delete()
                .eq('id', id);

            if (error) throw error;
            navigate('/');
        } catch (error) {
            console.error('Error deleting card:', error);
            alert('Failed to delete card');
        } finally {
            setDeleting(false);
        }
    };

    const nextImage = () => {
        if (!card?.image_urls) return;
        setCurrentImageIndex((prev) =>
            prev === card.image_urls.length - 1 ? 0 : prev + 1
        );
    };

    const prevImage = () => {
        if (!card?.image_urls) return;
        setCurrentImageIndex((prev) =>
            prev === 0 ? card.image_urls.length - 1 : prev - 1
        );
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!card) return null;

    // Fallback for migration: use image_urls array or single image_url
    const images = (card.image_urls && card.image_urls.length > 0)
        ? card.image_urls
        : (card.image_url ? [card.image_url] : []);

    const displayTitle = card.player_name ? `${card.year || ''} ${card.player_name}` : card.name;

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex items-center justify-between">
                    <Button variant="ghost" className="pl-0" onClick={() => navigate('/')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Collection
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/edit-card/${id}`)}>
                        Edit Card
                    </Button>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted shadow-lg border border-border">
                            {images.length > 0 ? (
                                <>
                                    <img
                                        src={images[currentImageIndex]}
                                        alt={displayTitle}
                                        className="h-full w-full object-contain"
                                    />
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={prevImage}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                                            >
                                                <ChevronLeft className="h-6 w-6" />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                                            >
                                                <ChevronRight className="h-6 w-6" />
                                            </button>
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                                                {currentImageIndex + 1} / {images.length}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    No Image
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl font-bold text-foreground">{displayTitle}</h1>
                            <p className="mt-2 text-2xl text-muted-foreground">{card.card_set || card.set_name}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20">
                                    {card.card_type || 'Card'}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-1 text-sm font-medium text-accent-foreground ring-1 ring-inset ring-accent/20">
                                    {card.grading_company && card.grading_company !== 'Raw'
                                        ? `${card.grading_company} ${card.grade_value}`
                                        : card.condition}
                                </span>
                                {card.price && (
                                    <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-sm font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
                                        ${card.price}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <h3 className="mb-4 text-lg font-semibold">Card Details</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Player</dt>
                                    <dd className="mt-1 text-sm text-foreground">{card.player_name || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Set / Year</dt>
                                    <dd className="mt-1 text-sm text-foreground">{card.year} {card.card_set}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Condition</dt>
                                    <dd className="mt-1 text-sm text-foreground">{card.condition}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Grade</dt>
                                    <dd className="mt-1 text-sm text-foreground">
                                        {card.grading_company !== 'Raw' ? `${card.grading_company} ${card.grade_value}` : 'Raw'}
                                    </dd>
                                </div>
                                {card.price && (
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Purchase Price</dt>
                                        <dd className="mt-1 text-sm text-foreground">${card.price}</dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Added On</dt>
                                    <dd className="mt-1 text-sm text-foreground">{new Date(card.created_at).toLocaleDateString()}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Custom Attributes */}
                        {card.custom_attributes && Object.keys(card.custom_attributes).length > 0 && (
                            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                                <h3 className="mb-4 text-lg font-semibold">Attributes</h3>
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                    {Object.entries(card.custom_attributes).map(([key, value]) => (
                                        <div key={key}>
                                            <dt className="text-sm font-medium text-muted-foreground capitalize">{key}</dt>
                                            <dd className="mt-1 text-sm text-foreground">{value as string}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}

                        {/* Notes */}
                        {card.notes && (
                            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                                <h3 className="mb-2 text-lg font-semibold">Notes</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.notes}</p>
                            </div>
                        )}

                        <div className="pt-4">
                            <Button
                                variant="outline"
                                className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={handleDelete}
                                isLoading={deleting}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Card
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
