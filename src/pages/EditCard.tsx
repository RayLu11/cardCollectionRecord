import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Upload, X, Plus, ArrowLeft } from 'lucide-react';
// import type { Card } from '../types'; // Unused in this file as we map directly to formData

const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor', 'Ungraded'];
const GRADING_COMPANIES = ['Raw', 'PSA', 'BGS', 'SGC', 'CGC', 'Other'];

export default function EditCard() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Images
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form Data
    const [formData, setFormData] = useState({
        player_name: '',
        card_set: '',
        card_type: 'Base',
        year: new Date().getFullYear().toString(),
        price: '',
        grading_company: 'Raw',
        grade_value: '',
        condition: 'Near Mint',
        notes: '',
    });

    // Custom Attributes
    const [customAttrs, setCustomAttrs] = useState<{ key: string; value: string }[]>([]);

    useEffect(() => {
        if (id && user) {
            fetchCard();
        }
    }, [id, user]);

    const fetchCard = async () => {
        try {
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .eq('id', id)
                .eq('user_id', user?.id)
                .single();

            if (error) throw error;
            if (data) {
                setFormData({
                    player_name: data.player_name || '',
                    card_set: data.card_set || data.set_name || '',
                    card_type: data.card_type || 'Base',
                    year: data.year ? data.year.toString() : '',
                    price: data.price ? data.price.toString() : '',
                    grading_company: data.grading_company || 'Raw',
                    grade_value: data.grade_value || '',
                    condition: data.condition || 'Near Mint',
                    notes: data.notes || '',
                });

                // Handle images
                const images = data.image_urls && data.image_urls.length > 0
                    ? data.image_urls
                    : (data.image_url ? [data.image_url] : []);
                setExistingImages(images);

                // Handle attributes
                if (data.custom_attributes) {
                    const attrs = Object.entries(data.custom_attributes).map(([key, value]) => ({
                        key,
                        value: String(value)
                    }));
                    setCustomAttrs(attrs);
                }
            }
        } catch (err) {
            console.error('Error fetching card:', err);
            navigate('/');
        } finally {
            setFetching(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setNewImageFiles(prev => [...prev, ...newFiles]);

            const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
            setNewPreviews(prev => [...prev, ...newPreviewUrls]);
        }
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index: number) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        setNewPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const addCustomAttr = () => {
        setCustomAttrs([...customAttrs, { key: '', value: '' }]);
    };

    const updateCustomAttr = (index: number, field: 'key' | 'value', val: string) => {
        const newAttrs = [...customAttrs];
        newAttrs[index][field] = val;
        setCustomAttrs(newAttrs);
    };

    const removeCustomAttr = (index: number) => {
        setCustomAttrs(customAttrs.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Upload New Images
            const uploadedUrls: string[] = [];
            for (const file of newImageFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('card-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('card-images')
                    .getPublicUrl(fileName);

                uploadedUrls.push(publicUrl);
            }

            // 2. Combine Images
            const finalImageUrls = [...existingImages, ...uploadedUrls];

            // 3. Prepare Custom Attributes JSON
            const attributesJson = customAttrs.reduce((acc, curr) => {
                if (curr.key.trim()) {
                    acc[curr.key.trim()] = curr.value;
                }
                return acc;
            }, {} as Record<string, string>);

            // 4. Update Record
            const { error: updateError } = await supabase
                .from('cards')
                .update({
                    player_name: formData.player_name,
                    card_set: formData.card_set,
                    card_type: formData.card_type,
                    year: parseInt(formData.year) || null,
                    price: parseFloat(formData.price) || null,
                    grading_company: formData.grading_company,
                    grade_value: formData.grade_value,
                    condition: formData.condition,
                    notes: formData.notes,
                    image_urls: finalImageUrls,
                    custom_attributes: attributesJson,
                    // Legacy fields sync
                    name: `${formData.year} ${formData.card_set} ${formData.player_name}`.trim(),
                    image_url: finalImageUrls[0] || null,
                })
                .eq('id', id)
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            navigate(`/card/${id}`);
        } catch (err: any) {
            console.error('Error updating card:', err);
            setError(err.message || 'Failed to update card');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-3xl">
                <div className="mb-8 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-bold text-foreground">Edit Card</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Image Upload */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium leading-none">Card Images</label>

                        {/* Image Grid */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {/* Existing Images */}
                            {existingImages.map((url, idx) => (
                                <div key={`existing-${idx}`} className="relative aspect-[3/4] group">
                                    <img src={url} alt={`Existing ${idx}`} className="h-full w-full rounded-lg object-cover border border-border" />
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(idx)}
                                        className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">Existing</div>
                                </div>
                            ))}

                            {/* New Previews */}
                            {newPreviews.map((url, idx) => (
                                <div key={`new-${idx}`} className="relative aspect-[3/4] group">
                                    <img src={url} alt={`New ${idx}`} className="h-full w-full rounded-lg object-cover border border-border" />
                                    <button
                                        type="button"
                                        onClick={() => removeNewImage(idx)}
                                        className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                    <div className="absolute bottom-1 left-1 bg-green-500/80 text-white text-[10px] px-1 rounded">New</div>
                                </div>
                            ))}

                            {/* Upload Button */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:bg-accent/50 transition-colors"
                            >
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <span className="mt-2 text-xs text-muted-foreground">Add Image</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Core Fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Player Name"
                            required
                            value={formData.player_name}
                            onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                        />
                        <Input
                            label="Card Set / Brand"
                            required
                            value={formData.card_set}
                            onChange={(e) => setFormData({ ...formData, card_set: e.target.value })}
                        />
                        <Input
                            label="Card Type"
                            value={formData.card_type}
                            onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
                            placeholder="Base, Parallel, Auto, Relic..."
                        />
                        <Input
                            label="Year"
                            type="number"
                            value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Grading Company</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={formData.grading_company}
                                onChange={(e) => setFormData({ ...formData, grading_company: e.target.value })}
                            >
                                {GRADING_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {formData.grading_company !== 'Raw' ? (
                            <Input
                                label="Grade Value"
                                value={formData.grade_value}
                                onChange={(e) => setFormData({ ...formData, grade_value: e.target.value })}
                                placeholder="e.g. 10, 9.5"
                            />
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Condition</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={formData.condition}
                                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                >
                                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <Input
                        label="Purchased Price ($)"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />

                    {/* Custom Attributes */}
                    <div className="space-y-4 rounded-lg border border-border p-4 bg-card/50">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold">Custom Attributes</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addCustomAttr}>
                                <Plus className="mr-2 h-4 w-4" /> Add Attribute
                            </Button>
                        </div>

                        {customAttrs.map((attr, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <Input
                                    placeholder="Name (e.g. Color)"
                                    value={attr.key}
                                    onChange={(e) => updateCustomAttr(idx, 'key', e.target.value)}
                                    className="flex-1"
                                />
                                <Input
                                    placeholder="Value (e.g. Blue)"
                                    value={attr.value}
                                    onChange={(e) => updateCustomAttr(idx, 'value', e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeCustomAttr(idx)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {customAttrs.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No custom attributes added.</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Notes</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Any extra details..."
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <Button type="button" variant="outline" onClick={() => navigate(-1)} className="w-full">
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={loading} className="w-full">
                            Update Card
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
