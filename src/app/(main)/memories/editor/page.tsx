'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { ContentBlock } from '@/components/editor/ContentBlock';
import { EditPanel } from '@/components/editor/EditPanel';
import { AddBlockButton } from '@/components/editor/AddBlockButton';
import type { TravelEditorData, ContentBlock as ContentBlockType } from '@/types/editor';
import { saveMemory } from '@/lib/storage';
import { useOptionalAuth } from '@/lib/auth';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';

const STORAGE_KEY = 'travel-editor-draft';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function TravelEditorPage() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const isDark = useDayNightTheme() === 'dark';

  const [editorData, setEditorData] = useState<TravelEditorData>({
    title: '',
    description: '',
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

    const allImages = collectImagesFromBlocks(editorData.blocks);
    if (allImages.length === 0) {
      alert('请至少添加一张照片（在内容块中添加图片）');
      return;
    }

    setIsSaving(true);

    try {
      const memoryData = {
        type: 'rich-story' as const,
        title: editorData.title,
        subtitle: editorData.description.slice(0, 50) || '旅行回忆',
        detailTitle: editorData.title,
        description: editorData.description,
        image: allImages[0] ?? '',
        gallery: allImages,
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

/** Collect all image URLs from image blocks (metadata.images or content). */
function collectImagesFromBlocks(blocks: TravelEditorData['blocks']): string[] {
  return blocks.filter((b) => b.type === 'image').flatMap((b) => (b.metadata?.images?.length ? b.metadata.images : b.content ? [b.content] : []));
}

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

    // Only open edit panel for non-text blocks; text is edited inline
    if (type !== 'text') {
      setEditingBlock(newBlock);
      setIsEditPanelOpen(true);
    }
    setSelectedBlockId(newBlock.id);
  }, [editorData.blocks.length]);

  const handleTextBlockChange = useCallback((blockId: string, content: string) => {
    setEditorData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === blockId ? { ...b, content } : b
      ),
    }));
  }, []);

  const handleBlockClick = useCallback((blockId: string) => {
    setSelectedBlockId((prev) => (prev === blockId ? prev : blockId));
  }, []);

  const handleDeselectBlocks = useCallback(() => {
    setSelectedBlockId(null);
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

  const handleDiscardBlock = useCallback(() => {
    if (!editingBlock) return;
    setEditorData((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== editingBlock.id),
    }));
    setSelectedBlockId(null);
    setIsEditPanelOpen(false);
    setEditingBlock(null);
  }, [editingBlock]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col animate-fadeIn font-sans transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0a] text-white'
          : 'bg-white text-black'
      }`}
    >
      <EditorHeader
        isDark={isDark}
        onBack={handleBack}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <div
        className="no-scrollbar flex-1 overflow-y-auto pb-24"
        onClick={handleDeselectBlocks}
        role="presentation"
      >
        <div className="px-8 pt-4 space-y-4 max-w-2xl mx-auto">
          {/* Title Input — Apple-style minimal, no heavy border */}
          <div className="pt-1">
            <input
              type="text"
              value={editorData.title}
              onChange={(e) =>
                setEditorData(prev => ({ ...prev, title: e.target.value }))
              }
              placeholder="输入标题..."
              className={`w-full text-2xl font-bold focus:outline-none bg-transparent placeholder:opacity-50 ${
                isDark ? 'text-white placeholder:text-white/40' : 'text-black placeholder:text-gray-300'
              }`}
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
              className={`w-full resize-none text-base focus:outline-none bg-transparent rounded-xl py-3 placeholder:opacity-50 ${
                isDark
                  ? 'text-white/80 placeholder:text-white/40 focus:bg-white/5'
                  : 'text-gray-600 placeholder:text-gray-300 focus:bg-gray-50/80'
              }`}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Content Blocks — 块间距 12px，符合 8pt 网格与可读性最佳实践 */}
          <div className="space-y-3 pt-2">
            {editorData.blocks
              .sort((a, b) => a.order - b.order)
              .map((block) => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  isDark={isDark}
                  onClick={() => handleBlockClick(block.id)}
                  onEdit={() => handleEditBlock(block.id)}
                  onTextChange={handleTextBlockChange}
                />
              ))}
          </div>

          {/* Add Block Button */}
          <div className="py-6">
            <AddBlockButton isDark={isDark} onAddBlock={handleAddBlock} />
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
        onDiscard={handleDiscardBlock}
        isDark={isDark}
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
