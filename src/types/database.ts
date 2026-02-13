/**
 * Supabase Database types for Orbit Journey
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          email: string | null;
          tier: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          tier?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      travel_memories: {
        Row: {
          id: string;
          user_id: string | null;
          /** Memory type: photo-gallery | cinematic | rich-story | video */
          type: string | null;
          title: string;
          subtitle: string;
          image_url: string;
          color: string;
          chord: number[];
          detail_title: string | null;
          category: string | null;
          gallery_urls: string[];
          description: string | null;
          rich_content: string | null;
          /** JSON string of ContentBlock[] for rich-story editor */
          editor_blocks_json: string | null;
          audio_urls: string[];
          video_urls: string[];
          lat: number | null;
          lng: number | null;
          place_name: string | null;
          place_address: string | null;
          sort_order: number;
          is_journey_start: boolean;
          is_journey_end: boolean;
          visibility: 'private' | 'public';
          cinematic_script_json: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type?: string | null;
          title: string;
          subtitle: string;
          image_url: string;
          color: string;
          chord: number[];
          detail_title?: string | null;
          category?: string | null;
          gallery_urls?: string[] | Json;
          description?: string | null;
          rich_content?: string | null;
          editor_blocks_json?: string | null;
          audio_urls?: string[] | Json;
          video_urls?: string[] | Json;
          lat?: number | null;
          lng?: number | null;
          place_name?: string | null;
          place_address?: string | null;
          sort_order?: number;
          is_journey_start?: boolean;
          is_journey_end?: boolean;
          visibility?: 'private' | 'public';
          cinematic_script_json?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['travel_memories']['Insert']>;
      };
    };
  };
}
