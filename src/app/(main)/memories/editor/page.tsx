'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { ContentBlock } from '@/components/editor/ContentBlock';
import { EditPanel } from '@/components/editor/EditPanel';
import { AddBlockButton } from '@/components/editor/AddBlockButton';
import type { TravelEditorData, ContentBlock as ContentBlockType } from '@/types/editor';
import { saveMemory, updateMemory } from '@/lib/storage';
import { useOptionalAuth } from '@/lib/auth';
import { MemoryService } from '@/lib/db/services/memory-service';

const STORAGE_KEY = 'travel-editor-draft';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function TravelEditorContent() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;

  const [editorData, setEditorData] = useState<TravelEditorData>({
    title: '',
    description: '',
    blocks: [],
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<ContentBlockType | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  // Load: from edit id (memory), from upload (sessionStorage), or draft (localStorage)
  useEffect(() => {
    const fromUpload = sessionStorage.getItem('editor-images');
    if (fromUpload) {
      try {
        const imageUrls: string[] = JSON.parse(fromUpload);
        const description = sessionStorage.getItem('editor-description') || '';
        sessionStorage.removeItem('editor-images');
        sessionStorage.removeItem('editor-description');
        setEditorData({
          title: '',
          description: description,
          blocks: imageUrls.length
            ? [
                {
                  id: generateId(),
                  type: 'image',
                  content: imageUrls[0] ?? '',
                  order: 0,
                  metadata: { images: imageUrls },
                },
              ]
            : [],
        });
        return;
      } catch (e) {
        console.error('Failed to parse editor-images:', e);
        sessionStorage.removeItem('editor-images');
        sessionStorage.removeItem('editor-description');
      }
    }

    if (editId) {
      MemoryService.getMemory(editId).then((memory) => {
        if (memory && (memory.type === 'rich-story' || (memory.editorBlocks != null && memory.editorBlocks.length > 0))) {
          const blocks = memory.editorBlocks ?? [];
          const normalized = blocks.map((b) => ({
            ...b,
            metadata: b.metadata?.images ? { ...b.metadata, images: b.metadata.images } : b.metadata,
          }));
          setEditorData({
            title: memory.detailTitle ?? memory.title ?? '',
            description: memory.description ?? '',
            blocks: normalized.length > 0 ? normalized : (memory.richContent ? [] : []),
          });
        } else if (memory) {
          setEditorData({
            title: memory.detailTitle ?? memory.title ?? '',
            description: memory.description ?? '',
            blocks: [],
          });
        }
      });
      return;
    }

    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setEditorData(draft);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [editId]);

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
      richContent: generateRichContent(editorData),
      editorBlocks: editorData.blocks,
    };

    try {
      if (editId) {
        const { data, error } = await updateMemory(userId, editId, memoryData);
        if (error) throw new Error(error);
        console.log('Memory updated:', data);
      } else if (userId) {
        const { data, error } = await saveMemory(userId, memoryData);
        if (error) throw new Error(error);
        console.log('Memory saved:', data);
      } else {
        const localMemories = JSON.parse(localStorage.getItem('local-memories') || '[]');
        const newMemory = { ...memoryData, id: generateId() };
        localMemories.push(newMemory);
        localStorage.setItem('local-memories', JSON.stringify(localMemories));
      }

      localStorage.removeItem(STORAGE_KEY);
      alert(editId ? '更新成功！' : '保存成功！');
      router.push(editId ? `/memories/${editId}` : '/');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [editorData, userId, router, editId]);

/** Collect all image URLs from image blocks (metadata.images or content). */
function collectImagesFromBlocks(blocks: TravelEditorData['blocks']): string[] {
  return blocks.filter((b) => b.type === 'image').flatMap((b) => (b.metadata?.images?.length ? b.metadata.images : b.content ? [b.content] : []));
}

  const handleOpenAddPanel = useCallback(() => {
    setEditingBlock(null);
    setIsEditPanelOpen(true);
  }, []);

  const handleSelectType = useCallback((type: ContentBlockType['type']) => {
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

    setEditingBlock(newBlock);
    setSelectedBlockId(newBlock.id);
    if (type === 'text') {
      setIsEditPanelOpen(false);
    }
  }, [editorData.blocks.length]);

  const handleInsertGeneratedContent = useCallback((html: string) => {
    const newBlock: ContentBlockType = {
      id: generateId(),
      type: 'richtext',
      content: html,
      order: editorData.blocks.length,
    };
    setEditorData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setSelectedBlockId(newBlock.id);
    setIsEditPanelOpen(false);
    setEditingBlock(null);
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
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn font-sans bg-[#fbfbfd] text-[#1d1d1f]">
      <EditorHeader
        onBack={handleBack}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <div
        className="no-scrollbar flex-1 overflow-y-auto pb-24 pt-[44px]"
        onClick={handleDeselectBlocks}
        role="presentation"
      >
        <div className="px-8 pt-4 space-y-4 max-w-2xl mx-auto">
          {/* Title Input — Apple-style minimal, light mode only */}
          <div className="pt-2">
            <input
              type="text"
              value={editorData.title}
              onChange={(e) =>
                setEditorData(prev => ({ ...prev, title: e.target.value }))
              }
              placeholder="输入标题..."
              className="w-full text-2xl font-bold focus:outline-none bg-transparent text-[#1d1d1f] placeholder:text-[#86868b]"
              maxLength={100}
            />
          </div>

          {/* Description Input — same height as text block (min 72px) */}
          <div>
            <textarea
              value={editorData.description}
              onChange={(e) =>
                setEditorData(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder="添加描述..."
              className="w-full resize-none text-base focus:outline-none bg-transparent rounded-xl py-3 text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-[#f5f5f7]/80"
              rows={1}
              style={{ minHeight: 72 }}
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
                  onClick={() => handleBlockClick(block.id)}
                  onEdit={() => handleEditBlock(block.id)}
                  onTextChange={handleTextBlockChange}
                />
              ))}
          </div>

          {/* Add Block Zone — rounded rectangle, opens edit panel type picker */}
          <div className="py-6">
            <AddBlockButton onAddClick={handleOpenAddPanel} />
          </div>
        </div>
      </div>

      {/* Edit Panel — type picker when block is null, block editor otherwise */}
      <EditPanel
        isOpen={isEditPanelOpen}
        onClose={handleCloseEditPanel}
        block={editingBlock}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        onDiscard={handleDiscardBlock}
        onSelectType={handleSelectType}
        onInsertGeneratedContent={handleInsertGeneratedContent}
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
      case 'richtext':
        if (block.content) {
          html += block.content;
        }
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

export default function TravelEditorPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#fbfbfd]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1d1d1f] border-t-transparent"></div>
      </div>
    }>
      <TravelEditorContent />
    </Suspense>
  );
}
