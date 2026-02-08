/**
 * Travel Editor Types
 * Types for the travel content editor
 */

export type ContentBlockType = 'text' | 'image' | 'video' | 'audio';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  order: number;
  metadata?: {
    duration?: number; // For video/audio
    thumbnail?: string; // For video
    fileName?: string;
  };
}

export interface TravelEditorData {
  title: string;
  description: string;
  images: string[]; // Fixed 4 images for grid display
  blocks: ContentBlock[];
}

export interface EditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  block: ContentBlock | null;
  onSave: (block: ContentBlock) => void;
  onDelete: () => void;
}

export interface ContentBlockProps {
  block: ContentBlock;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
}
