export interface Card {
    id: string;
    user_id: string;
    // Core Fields
    player_name: string;
    card_set: string;
    card_type: string;
    year: number | null;
    price: number | null;
    grading_company: string;
    grade_value: string;
    condition: string;
    notes: string;

    // Media & Meta
    image_urls: string[]; // Array of URLs
    custom_attributes: Record<string, string>; // JSONB key-value

    created_at: string;

    // Legacy fields (optional support if needed during migration)
    name?: string;
    set_name?: string;
    image_url?: string;
}
