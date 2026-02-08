'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { PhotoGridSection } from '@/components/editor/PhotoGridSection';
import { ContentBlock } from '@/components/editor/ContentBlock';
import { EditPanel } from '@/components/editor/EditPanel';
import { AddBlockButton } from '@/components/editor/AddBlockButton';
import type { TravelEditorData, ContentBlock as ContentBlockType } from '@/types/editor';
import { saveMemory } from '@/lib/storage';
import { useOptionalAuth } from '@/lib/auth';

const STORAGE_KEY = 'travel-editor-draft';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function TravelEditorPage() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;

  const [editorData, setEditorData] = useState<TravelEditorData>({
    title: '',
    description: '',
    images: [],
    blocks: [],
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<ContentBlockType | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setEditorData(draft);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }

    // Load images from sessionStorage (from upload page)
    const uploadedImages = sessionStorage.getItem('editor-images');
    if (uploadedImages) {
      try {
        const images = JSON.parse(uploadedImages);
        setEditorData(prev => ({ ...prev, images: images.slice(0, 4) }));
        sessionStorage.removeItem('editor-images');
      } catch (e) {
        console.error('Failed to load uploaded images:', e);
      }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(editorData));
    }, 1000);

    return () => clearTimeout(timer);
  }, [editorData]);

  const handleBack = useCallback(() => {
    const shouldLeave = confirm('确定要离开吗？未保存的内容将丢失。');
    if (shouldLeave) {
      localStorage.removeItem(STORAGE_KEY);
      router.back();
    }
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!editorData.title.trim()) {
      alert('请输入标题');
      return;
    }

    if (editorData.images.length === 0) {
      alert('请至少添加一张照片');
      return;
    }

    setIsSaving(true);

    try {
      // Convert editor data to memory format
      const memoryData = {
        type: 'rich-story' as const,
        title: editorData.title,
        subtitle: editorData.description.slice(0, 50) || '旅行回忆',
        detailTitle: editorData.title,
        description: editorData.description,
        image: editorData.images[0] || '',
        gallery: editorData.images,
        color: '#3B82F6',
        chord: [0.2, 0.4, 0.6],
        category: '旅行回忆',
        // Store blocks as rich content (can be enhanced later)
        richContent: generateRichContent(editorData),
      };

      if (userId) {
        const { data, error } = await saveMemory(userId, memoryData);
        if (error) {
          throw new Error(error);
        }
        console.log('Memory saved:', data);
      } else {
        // Save locally for non-authenticated users
        const localMemories = JSON.parse(localStorage.getItem('local-memories') || '[]');
        const newMemory = { ...memoryData, id: generateId() };
        localMemories.push(newMemory);
        localStorage.setItem('local-memories', JSON.stringify(localMemories));
      }

      // Clear draft after successful save
      localStorage.removeItem(STORAGE_KEY);
      alert('保存成功！');
      router.push('/memories');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [editorData, userId, router]);

  const handleAddBlock = useCallback((type: ContentBlockType['type']) => {
    const newBlock: ContentBlockType = {
      id: generateId(),
      type,
      content: '',
      order: editorData.blocks.length,
    };

    setEditorData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));

    // Automatically open edit panel for new block
    setEditingBlock(newBlock);
    setIsEditPanelOpen(true);
    setSelectedBlockId(newBlock.id);
  }, [editorData.blocks.length]);

  const handleBlockClick = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
  }, []);

  const handleEditBlock = useCallback((blockId: string) => {
    const block = editorData.blocks.find(b => b.id === blockId);
    if (block) {
      setEditingBlock(block);
      setIsEditPanelOpen(true);
    }
  }, [editorData.blocks]);

  const handleSaveBlock = useCallback((updatedBlock: ContentBlockType) => {
    setEditorData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === updatedBlock.id ? updatedBlock : b
      ),
    }));
  }, []);

  const handleDeleteBlock = useCallback(() => {
    if (!editingBlock) return;

    const shouldDelete = confirm('确定要删除这个内容块吗？');
    if (shouldDelete) {
      setEditorData(prev => ({
        ...prev,
        blocks: prev.blocks.filter(b => b.id !== editingBlock.id),
      }));
      setIsEditPanelOpen(false);
      setEditingBlock(null);
      setSelectedBlockId(null);
    }
  }, [editingBlock]);

  const handleCloseEditPanel = useCallback(() => {
    setIsEditPanelOpen(false);
    setEditingBlock(null);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-white font-sans text-black">
      <EditorHeader onBack={handleBack} onSave={handleSave} isSaving={isSaving} />

      <div className="no-scrollbar flex-1 overflow-y-auto pb-24">
        {/* Photo Grid Section */}
        <PhotoGridSection
          images={editorData.images}
          onUpdateImages={(images) =>
            setEditorData(prev => ({ ...prev, images }))
          }
        />

        {/* Content Section */}
        <div className="px-4 space-y-6">
          {/* Title Input */}
          <div>
            <input
              type="text"
              value={editorData.title}
              onChange={(e) =>
                setEditorData(prev => ({ ...prev, title: e.target.value }))
              }
              placeholder="输入标题..."
              className="w-full text-2xl font-bold text-black placeholder:text-gray-300 focus:outline-none"
              maxLength={100}
            />
          </div>

          {/* Description Input */}
          <div>
            <textarea
              value={editorData.description}
              onChange={(e) =>
                setEditorData(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder="添加描述..."
              className="w-full resize-none text-base text-gray-600 placeholder:text-gray-300 focus:outline-none"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Content Blocks */}
          <div className="space-y-4 pt-4">
            {editorData.blocks
              .sort((a, b) => a.order - b.order)
              .map((block) => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onClick={() => handleBlockClick(block.id)}
                  onEdit={() => handleEditBlock(block.id)}
                />
              ))}
          </div>

          {/* Add Block Button */}
          <div className="py-8">
            <AddBlockButton onAddBlock={handleAddBlock} />
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      <EditPanel
        isOpen={isEditPanelOpen}
        onClose={handleCloseEditPanel}
        block={editingBlock}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
      />
    </div>
  );
}

/**
 * Generate rich HTML content from editor blocks
 * This can be enhanced later with a proper rich text format
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateRichContent(data: TravelEditorData): string {
  let html = '';

  data.blocks.forEach((block) => {
    switch (block.type) {
      case 'text':
        html += `<p>${escapeHtml(block.content)}</p>`;
        break;
      case 'image':
        if (block.content) {
          html += `<img src="${escapeHtml(block.content)}" alt="Travel memory" />`;
        }
        break;
      case 'video':
        if (block.content) {
          html += `<video src="${escapeHtml(block.content)}" controls></video>`;
        }
        break;
      case 'audio':
        if (block.content) {
          html += `<audio src="${escapeHtml(block.content)}" controls></audio>`;
        }
        break;
    }
  });

  return html;
}
