'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Edit2 } from 'lucide-react';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { ContentBlock } from '@/components/editor/ContentBlock';
import { EditPanel } from '@/components/editor/EditPanel';
import { AddBlockButton } from '@/components/editor/AddBlockButton';
import type { TravelEditorData, ContentBlock as ContentBlockType, SectionBlockData, SectionTemplateId, TitleStyle } from '@/types/editor';
import type { AIGeneratedDocBlock } from '@/types/ai-document-blocks';
import type { LayoutType, StoryBlock } from '@/types/cinematic';
import { getCinematicPlaceholderImage } from '@/lib/editor-cinematic-templates';
import { getDefaultSectionData } from '@/lib/editor-section-templates';
import { saveMemory, updateMemory } from '@/lib/storage';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { MemoryService } from '@/lib/db/services/memory-service';
import { resolveCoordinatesForLocation } from '@/lib/upload-to-memory';

const STORAGE_KEY = 'travel-editor-draft';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function TravelEditorContent() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const { t } = useLocale();
  const userId = auth?.user?.id ?? null;

  const [editorData, setEditorData] = useState<TravelEditorData>({
    title: '',
    description: '',
    location: '',
    blocks: [],
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<ContentBlockType | null>(null);
  const [editingTarget, setEditingTarget] = useState<'title' | 'description' | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const saveInProgressRef = useRef(false);

  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  // Load: from edit id (memory), from upload (sessionStorage), or draft (localStorage)
  useEffect(() => {
    const fromUpload = sessionStorage.getItem('editor-images');
    if (fromUpload) {
      try {
        const imageUrls: string[] = JSON.parse(fromUpload);
        const description = sessionStorage.getItem('editor-description') || '';
        const location = sessionStorage.getItem('editor-location') || '';
        sessionStorage.removeItem('editor-images');
        sessionStorage.removeItem('editor-description');
        sessionStorage.removeItem('editor-location');
        setEditorData({
          title: '',
          description: description,
          location: location,
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
        sessionStorage.removeItem('editor-location');
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
          const location = memory.coordinates?.name ?? memory.subtitle ?? '';
          setEditorData({
            title: memory.detailTitle ?? memory.title ?? '',
            description: memory.description ?? '',
            location: typeof location === 'string' ? location : '',
            blocks: normalized.length > 0 ? normalized : (memory.richContent ? [] : []),
          });
        } else if (memory) {
          const location = memory.coordinates?.name ?? memory.subtitle ?? '';
          setEditorData({
            title: memory.detailTitle ?? memory.title ?? '',
            description: memory.description ?? '',
            location: typeof location === 'string' ? location : '',
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
    const shouldLeave = confirm(t('editor.confirmLeave'));
    if (shouldLeave) {
      localStorage.removeItem(STORAGE_KEY);
      router.back();
    }
  }, [router, t]);

  const handleSave = useCallback(async () => {
    if (saveInProgressRef.current) return;
    if (!editorData.title.trim()) {
      alert(t('editor.enterTitle'));
      return;
    }

    const allImages = collectImagesFromBlocks(editorData.blocks);
    if (allImages.length === 0) {
      alert(t('editor.addOnePhoto'));
      return;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);

    const locationStr = (editorData.location ?? '').trim();
    const coordinates = locationStr ? resolveCoordinatesForLocation(locationStr) : undefined;
    const memoryData = {
      type: 'rich-story' as const,
      title: editorData.title,
      subtitle: locationStr || editorData.description.slice(0, 50) || t('editor.travelMemory'),
      detailTitle: editorData.title,
      description: editorData.description,
      image: allImages[0] ?? '',
      gallery: allImages,
      color: '#3B82F6',
      chord: [0.2, 0.4, 0.6],
      category: t('editor.travelMemory'),
      richContent: generateRichContent(editorData),
      editorBlocks: editorData.blocks,
      ...(coordinates && { coordinates }),
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
      alert(editId ? t('editor.updateSuccess') : t('editor.saveSuccess'));
      router.push(editId ? `/memories/${editId}` : '/');
    } catch (error) {
      console.error('Failed to save:', error);
      alert(t('editor.saveFailed'));
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  }, [editorData, userId, router, editId, t]);

/** Collect all image URLs from image, cinematic, and section blocks. */
function collectImagesFromBlocks(blocks: TravelEditorData['blocks']): string[] {
  const fromImage = blocks.filter((b) => b.type === 'image').flatMap((b) => (b.metadata?.images?.length ? b.metadata.images : b.content ? [b.content] : []));
  const fromCinematic = blocks.filter((b) => b.type === 'cinematic').map((b) => b.metadata?.cinematicImage).filter(Boolean) as string[];
  const fromSection = blocks
    .filter((b) => b.type === 'section' && b.metadata?.sectionData)
    .flatMap((b) => collectSectionImages(b.metadata!.sectionData!));
  return [...fromImage, ...fromCinematic, ...fromSection];
}

function collectSectionImages(data: SectionBlockData): string[] {
  const urls: string[] = [];
  if (data.feature_card?.image) urls.push(data.feature_card.image);
  if (data.marquee?.items) data.marquee.items.forEach((i) => i.image && urls.push(i.image));
  return urls;
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

  const handleSelectCinematicTemplate = useCallback((layout: LayoutType) => {
    const newBlock: ContentBlockType = {
      id: generateId(),
      type: 'cinematic',
      content: '',
      order: editorData.blocks.length,
      metadata: {
        cinematicLayout: layout,
        cinematicImage: getCinematicPlaceholderImage(),
      },
    };
    setEditorData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setEditingBlock(newBlock);
    setSelectedBlockId(newBlock.id);
  }, [editorData.blocks.length]);

  const handleSelectSectionTemplate = useCallback((templateId: SectionTemplateId) => {
    const newBlock: ContentBlockType = {
      id: generateId(),
      type: 'section',
      content: '',
      order: editorData.blocks.length,
      metadata: {
        sectionTemplateId: templateId,
        sectionData: getDefaultSectionData(templateId),
      },
    };
    setEditorData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setEditingBlock(newBlock);
    setSelectedBlockId(newBlock.id);
    setIsEditPanelOpen(true);
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

  const handleInsertGeneratedBlocks = useCallback((blocks: AIGeneratedDocBlock[], imageUrls: string[]) => {
    const baseOrder = editorData.blocks.length;
    const newBlocks: ContentBlockType[] = blocks.map((b, i) => {
      const id = generateId();
      const order = baseOrder + i;
      if (b.type === 'richtext') {
        return { id, type: 'richtext', content: b.content ?? '', order };
      }
      if (b.type === 'text') {
        return { id, type: 'text', content: b.content ?? '', order };
      }
      if (b.type === 'image') {
        const url = imageUrls[b.imageIndex];
        return {
          id,
          type: 'image',
          content: url ?? '',
          order,
          metadata: { images: url ? [url] : [] },
        };
      }
      return { id, type: 'text', content: '', order };
    });
    setEditorData(prev => ({
      ...prev,
      blocks: [...prev.blocks, ...newBlocks],
    }));
    if (newBlocks.length > 0) setSelectedBlockId(newBlocks[0].id);
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

    const shouldDelete = confirm(t('editor.confirmDeleteBlock'));
    if (shouldDelete) {
      setEditorData(prev => ({
        ...prev,
        blocks: prev.blocks.filter(b => b.id !== editingBlock.id),
      }));
      setIsEditPanelOpen(false);
      setEditingBlock(null);
      setSelectedBlockId(null);
    }
  }, [editingBlock, t]);

  const handleCloseEditPanel = useCallback(() => {
    setIsEditPanelOpen(false);
    setEditingBlock(null);
    setEditingTarget(null);
  }, []);

  const handleSaveTitle = useCallback((data: { title: string; titleStyle?: TitleStyle }) => {
    setEditorData(prev => ({ ...prev, title: data.title, titleStyle: data.titleStyle }));
  }, []);

  const handleSaveDescription = useCallback((data: { description: string; descriptionStyle?: TitleStyle }) => {
    setEditorData(prev => ({ ...prev, description: data.description, descriptionStyle: data.descriptionStyle }));
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

  const handleCinematicBlockUpdate = useCallback((blockId: string, updates: Partial<StoryBlock>) => {
    setEditorData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId || b.type !== 'cinematic') return b;
        return {
          ...b,
          content: updates.text !== undefined ? updates.text : b.content,
          metadata: {
            ...b.metadata,
            ...(updates.image !== undefined && { cinematicImage: updates.image }),
            ...(updates.imageFilter !== undefined && { imageFilter: updates.imageFilter }),
            ...(updates.mood !== undefined && { mood: updates.mood }),
          },
        };
      }),
    }));
  }, []);

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
          {/* Title — direct edit; focus 时右上角绝对定位编辑按钮，不占文档流 */}
          <div
            className="relative pt-2"
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTitleFocused(false); }}
          >
            <input
              type="text"
              value={editorData.title}
              onChange={(e) =>
                setEditorData(prev => ({ ...prev, title: e.target.value }))
              }
              onFocus={() => setTitleFocused(true)}
              placeholder={t('editor.title')}
              className="w-full font-bold focus:outline-none bg-transparent placeholder:text-[#86868b]"
              style={{
                fontSize: editorData.titleStyle?.fontSize === 'small' ? '1.25rem' : editorData.titleStyle?.fontSize === 'large' ? '1.75rem' : '1.5rem',
                color: editorData.titleStyle?.textColor ?? '#1d1d1f',
                textAlign: editorData.titleStyle?.textAlign ?? 'left',
              }}
              maxLength={100}
            />
            {titleFocused && (
              <button
                type="button"
                onClick={() => {
                  setEditingBlock(null);
                  setEditingTarget('title');
                  setIsEditPanelOpen(true);
                }}
                className="absolute top-2 right-0 z-10 flex items-center gap-1 rounded-full pl-2.5 pr-2.5 py-1.5 text-[11px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 active:scale-[0.98]"
                aria-label={t('editor.editTitle')}
              >
                <Edit2 size={10} strokeWidth={2.5} />
                <span>{t('common.edit')}</span>
              </button>
            )}
          </div>

          {/* Location — travel place for this memory; shown in edit and stored in Memory */}
          <div className="pt-1">
            <label htmlFor="editor-location" className="sr-only">
              {t('cinematic.location')}
            </label>
            <input
              id="editor-location"
              type="text"
              value={editorData.location ?? ''}
              onChange={(e) =>
                setEditorData(prev => ({ ...prev, location: e.target.value }))
              }
              placeholder={t('upload.locationPlaceholder')}
              className="w-full text-sm text-[#86868b] focus:text-[#1d1d1f] focus:outline-none bg-transparent placeholder:text-[#86868b] border-b border-[#d2d2d7] focus:border-[#1d1d1f] pb-1.5 transition-colors"
              maxLength={120}
            />
          </div>

          {/* Description — 同上：直接编辑，focus 时右上角绝对定位编辑按钮，不占文档流 */}
          <div
            className="relative"
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDescriptionFocused(false); }}
          >
            <textarea
              value={editorData.description}
              onChange={(e) =>
                setEditorData(prev => ({ ...prev, description: e.target.value }))
              }
              onFocus={() => setDescriptionFocused(true)}
              placeholder={t('editor.description')}
              className="w-full resize-none focus:outline-none bg-transparent rounded-xl py-3 placeholder:text-[#86868b] focus:bg-[#f5f5f7]/80"
              style={{
                minHeight: 72,
                fontSize: editorData.descriptionStyle?.fontSize === 'small' ? 14 : editorData.descriptionStyle?.fontSize === 'large' ? 18 : 16,
                color: editorData.descriptionStyle?.textColor ?? '#1d1d1f',
                textAlign: editorData.descriptionStyle?.textAlign ?? 'left',
              }}
              rows={1}
              maxLength={500}
            />
            {descriptionFocused && (
              <button
                type="button"
                onClick={() => {
                  setEditingBlock(null);
                  setEditingTarget('description');
                  setIsEditPanelOpen(true);
                }}
                className="absolute top-2 right-0 z-10 flex items-center gap-1 rounded-full pl-2.5 pr-2.5 py-1.5 text-[11px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 active:scale-[0.98]"
                aria-label={t('editor.editDescription')}
              >
                <Edit2 size={10} strokeWidth={2.5} />
                <span>{t('common.edit')}</span>
              </button>
            )}
          </div>

          {/* Content Blocks — 块间距 12px，符合 8pt 网格与可读性最佳实践 */}
          <div className="space-y-3 pt-2">
            {editorData.blocks
              .sort((a, b) => a.order - b.order)
              .map((block, index) => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  index={index}
                  isSelected={selectedBlockId === block.id}
                  onClick={() => handleBlockClick(block.id)}
                  onEdit={() => handleEditBlock(block.id)}
                  onTextChange={handleTextBlockChange}
                  onCinematicUpdate={handleCinematicBlockUpdate}
                />
              ))}
          </div>

          {/* Add Block — fixed at bottom, no wrapper background, safe area */}
          <div
            className="fixed left-0 right-0 z-10 flex justify-center items-center pointer-events-none"
            style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="pointer-events-auto flex justify-center w-full max-w-[280px] px-4">
              <AddBlockButton onAddClick={handleOpenAddPanel} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Panel — type picker when block is null; title/description editor when editingTarget set; block editor otherwise */}
      <EditPanel
        isOpen={isEditPanelOpen}
        onClose={handleCloseEditPanel}
        block={editingBlock}
        editingTarget={editingTarget}
        titleData={{ title: editorData.title, titleStyle: editorData.titleStyle }}
        descriptionData={{ description: editorData.description, descriptionStyle: editorData.descriptionStyle }}
        onSaveTitle={handleSaveTitle}
        onSaveDescription={handleSaveDescription}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        onDiscard={handleDiscardBlock}
        onSelectType={handleSelectType}
        onSelectCinematicTemplate={handleSelectCinematicTemplate}
        onSelectSectionTemplate={handleSelectSectionTemplate}
        onInsertGeneratedContent={handleInsertGeneratedContent}
        onInsertGeneratedBlocks={handleInsertGeneratedBlocks}
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

/** Emit semantic HTML for a section block (for rich story / saved memory). */
function sectionBlockToHtml(
  templateId: SectionTemplateId | undefined,
  data: SectionBlockData | undefined
): string {
  if (!templateId || !data) return '';
  const wrap = (inner: string) => `<section class="editor-section" data-template="${escapeHtml(templateId)}">${inner}</section>`;
  switch (templateId) {
    case 'tile_gallery': {
      const d = data.tile_gallery;
      if (!d?.tiles?.length) return '';
      let inner = d.sectionHeadline ? `<h2>${escapeHtml(d.sectionHeadline)}</h2>` : '';
      inner += '<ul class="tile-list">' + d.tiles.map((t) => `<li><strong>${escapeHtml(t.title)}</strong><p>${escapeHtml(t.copy)}</p>${t.ctaLabel ? `<a href="${t.ctaHref ? escapeHtml(t.ctaHref) : '#'}">${escapeHtml(t.ctaLabel)}</a>` : ''}</li>`).join('') + '</ul>';
      return wrap(inner);
    }
    case 'feature_card': {
      const d = data.feature_card;
      if (!d) return '';
      let inner = d.image ? `<img src="${escapeHtml(d.image)}" alt="" />` : '';
      inner += `<h3>${escapeHtml(d.title)}</h3>`;
      if (d.subtitle) inner += `<p>${escapeHtml(d.subtitle)}</p>`;
      if (d.ctaLabel) inner += `<a href="${d.ctaHref ? escapeHtml(d.ctaHref) : '#'}">${escapeHtml(d.ctaLabel)}</a>`;
      return wrap(inner);
    }
    case 'marquee': {
      const d = data.marquee;
      if (!d?.items?.length) return '';
      const list = d.items.map((i) => `<li>${i.image ? `<img src="${escapeHtml(i.image)}" alt="" />` : ''}<span>${escapeHtml(i.title)}</span>${i.ctaLabel ? `<a href="${i.href ? escapeHtml(i.href) : '#'}">${escapeHtml(i.ctaLabel)}</a>` : ''}</li>`).join('');
      return wrap('<ul class="marquee-list">' + list + '</ul>');
    }
    default:
      return '';
  }
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
      case 'cinematic': {
        const img = block.metadata?.cinematicImage;
        if (img) html += `<img src="${escapeHtml(img)}" alt="Story moment" />`;
        if (block.content) html += `<p>${escapeHtml(block.content)}</p>`;
        break;
      }
      case 'section': {
        html += sectionBlockToHtml(block.metadata?.sectionTemplateId, block.metadata?.sectionData);
        break;
      }
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
