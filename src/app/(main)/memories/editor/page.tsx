'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
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
import { blobUrlToPersistentUrl } from '@/lib/upload-media';

const STORAGE_KEY = 'travel-editor-draft';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

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
  if (data.marquee?.items) data.marquee.items.forEach((i) => i.image && urls.push(i.image));
  return urls;
}

/** Resolve blob: URLs in blocks to persistent URLs (Supabase/GCS/data URL) so shared content shows images. */
async function resolveBlobUrlsInBlocks(
  blocks: TravelEditorData['blocks'],
  userId: string | null
): Promise<TravelEditorData['blocks']> {
  const urlSet = new Set(collectImagesFromBlocks(blocks));
  const blobUrls = [...urlSet].filter((u) => typeof u === 'string' && u.startsWith('blob:'));
  if (blobUrls.length === 0) return blocks;

  const resolved = await Promise.all(
    blobUrls.map((u) => blobUrlToPersistentUrl(u, { userId }))
  );
  const urlMap = new Map<string, string>(blobUrls.map((u, i) => [u, resolved[i] ?? u]));

  function replaceUrl(url: string): string {
    return urlMap.get(url) ?? url;
  }

  return blocks.map((block) => {
    const next = { ...block, metadata: block.metadata ? { ...block.metadata } : undefined };
    if (next.type === 'image') {
      if (next.content) next.content = replaceUrl(next.content);
      if (next.metadata?.images) {
        next.metadata = { ...next.metadata, images: next.metadata.images.map(replaceUrl) };
      }
    } else if (next.type === 'cinematic' && next.metadata?.cinematicImage) {
      next.metadata = { ...next.metadata, cinematicImage: replaceUrl(next.metadata.cinematicImage) };
    } else if (next.type === 'section' && next.metadata?.sectionData) {
      const sd = { ...next.metadata.sectionData };
      if (sd.marquee?.items) {
        sd.marquee = {
          ...sd.marquee,
          items: sd.marquee.items.map((i) => (i.image ? { ...i, image: replaceUrl(i.image) } : i)),
        };
      }
      next.metadata = { ...next.metadata, sectionData: sd };
    }
    return next;
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sectionBlockToHtml(
  templateId: SectionTemplateId | undefined,
  data: SectionBlockData | undefined
): string {
  if (!templateId || !data) return '';
  const wrap = (inner: string) => `<section class="editor-section" data-template="${escapeHtml(templateId)}">${inner}</section>`;
  switch (templateId) {
    case 'marquee': {
      const d = data.marquee;
      if (!d?.items?.length) return '';
      const list = d.items.map((i) => `<li>${i.image ? `<img src="${escapeHtml(i.image)}" alt="" />` : ''}<span>${escapeHtml(i.title)}</span>${i.ctaLabel ? `<a href="${i.href ? escapeHtml(i.href) : '#'}">${escapeHtml(i.ctaLabel)}</a>` : ''}</li>`).join('');
      return wrap('<ul class="marquee-list">' + list + '</ul>');
    }
    case 'friends': {
      const list = data.friends;
      if (!list?.length) return '';
      const items = list.map((d) => {
        const avatarHtml = d.avatar ? `<img src="${escapeHtml(d.avatar)}" alt="" width="36" height="36" />` : '';
        return `<div class="editor-friends-item"><div class="editor-friends-avatar">${avatarHtml}</div><div class="editor-friends-body"><div class="editor-friends-name">${escapeHtml(d.name)}</div><div class="editor-friends-desc">${escapeHtml(d.description)}</div></div></div>`;
      }).join('');
      return wrap(`<div class="editor-friends">${items}</div>`);
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
        if (block.content) html += block.content;
        break;
      case 'image':
        if (block.content) html += `<img src="${escapeHtml(block.content)}" alt="Travel memory" />`;
        break;
      case 'cinematic': {
        const img = block.metadata?.cinematicImage;
        if (img) html += `<img src="${escapeHtml(img)}" alt="Story moment" />`;
        if (block.content) html += `<p>${escapeHtml(block.content)}</p>`;
        break;
      }
      case 'section':
        html += sectionBlockToHtml(block.metadata?.sectionTemplateId, block.metadata?.sectionData);
        break;
      case 'divider': {
        const style = block.metadata?.dividerStyle ?? 'default';
        if (style === 'accent') {
          html += '<div class="editor-divider-accent" role="separator" aria-hidden="true"><span class="editor-divider-line"></span><span class="editor-divider-dot"></span><span class="editor-divider-line"></span></div>';
        } else {
          html += `<hr class="editor-divider" data-style="${escapeHtml(style)}" />`;
        }
        break;
      }
      case 'video':
        if (block.content) html += `<video src="${escapeHtml(block.content)}" controls></video>`;
        break;
      case 'audio':
        if (block.content) html += `<audio src="${escapeHtml(block.content)}" controls></audio>`;
        break;
    }
  });
  return html;
}

function TravelEditorContent() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const { t } = useLocale();
  const userId = auth?.user?.id ?? null;

  // ─── Split state: header fields vs blocks ───────────────────────────────────
  // Separating title/description/location from blocks means typing in header
  // fields does NOT trigger ContentBlock re-renders (blocks state unchanged).
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [titleStyle, setTitleStyle] = useState<TitleStyle | undefined>(undefined);
  const [descriptionStyle, setDescriptionStyle] = useState<TitleStyle | undefined>(undefined);
  const [blocks, setBlocks] = useState<ContentBlockType[]>([]);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<ContentBlockType | null>(null);
  const [editingTarget, setEditingTarget] = useState<'title' | 'description' | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [newlyAddedBlockId, setNewlyAddedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const saveInProgressRef = useRef(false);
  // Refs that are always current — let zero-dependency callbacks read live state
  const blocksLengthRef = useRef(0);
  const blocksRef = useRef<ContentBlockType[]>([]);
  const editingBlockRef = useRef<ContentBlockType | null>(null);
  useEffect(() => { blocksLengthRef.current = blocks.length; blocksRef.current = blocks; }, [blocks]);
  useEffect(() => { editingBlockRef.current = editingBlock; }, [editingBlock]);

  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  // Load: from edit id (memory), from upload (sessionStorage), or draft (localStorage)
  useEffect(() => {
    const fromUpload = sessionStorage.getItem('editor-images');
    if (fromUpload) {
      try {
        const imageUrls: string[] = JSON.parse(fromUpload);
        const desc = sessionStorage.getItem('editor-description') || '';
        const loc = sessionStorage.getItem('editor-location') || '';
        sessionStorage.removeItem('editor-images');
        sessionStorage.removeItem('editor-description');
        sessionStorage.removeItem('editor-location');
        setTitle('');
        setDescription(desc);
        setLocation(loc);
        setBlocks(
          imageUrls.length
            ? [{ id: generateId(), type: 'image', content: imageUrls[0] ?? '', order: 0, metadata: { images: imageUrls } }]
            : []
        );
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
          const rawBlocks = memory.editorBlocks ?? [];
          const normalized = rawBlocks.map((b) => ({
            ...b,
            metadata: b.metadata?.images ? { ...b.metadata, images: b.metadata.images } : b.metadata,
          }));
          const loc = memory.coordinates?.name ?? memory.subtitle ?? '';
          setTitle(memory.detailTitle ?? memory.title ?? '');
          setDescription(memory.description ?? '');
          setLocation(typeof loc === 'string' ? loc : '');
          setBlocks(normalized);
        } else if (memory) {
          const loc = memory.coordinates?.name ?? memory.subtitle ?? '';
          setTitle(memory.detailTitle ?? memory.title ?? '');
          setDescription(memory.description ?? '');
          setLocation(typeof loc === 'string' ? loc : '');
          setBlocks([]);
        }
      });
      return;
    }

    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft: TravelEditorData = JSON.parse(savedDraft);
        setTitle(draft.title ?? '');
        setDescription(draft.description ?? '');
        setLocation(draft.location ?? '');
        setTitleStyle(draft.titleStyle);
        setDescriptionStyle(draft.descriptionStyle);
        setBlocks(draft.blocks ?? []);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [editId]);

  // Auto-save to localStorage (debounced, assembles full data only for storage)
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft: TravelEditorData = { title, description, location, titleStyle, descriptionStyle, blocks };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, description, location, titleStyle, descriptionStyle, blocks]);

  // Stable sorted blocks — avoids creating a new array every render
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order - b.order),
    [blocks]
  );

  const handleBack = useCallback(() => {
    const shouldLeave = confirm(t('editor.confirmLeave'));
    if (shouldLeave) {
      localStorage.removeItem(STORAGE_KEY);
      router.back();
    }
  }, [router, t]);

  const handleSave = useCallback(async () => {
    if (saveInProgressRef.current) return;
    if (!title.trim()) {
      alert(t('editor.enterTitle'));
      return;
    }

    const allImages = collectImagesFromBlocks(blocks);
    if (allImages.length === 0) {
      alert(t('editor.addOnePhoto'));
      return;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);

    const locationStr = (location ?? '').trim();
    const coordinates = locationStr ? resolveCoordinatesForLocation(locationStr) : undefined;

    let blocksToSave = blocks;
    try {
      blocksToSave = await resolveBlobUrlsInBlocks(blocks, userId);
    } catch (e) {
      console.error('Failed to resolve blob URLs for save:', e);
    }
    const resolvedImages = collectImagesFromBlocks(blocksToSave);

    const editorDataForHtml: TravelEditorData = { title, description, location, blocks: blocksToSave };
    const memoryData = {
      type: 'rich-story' as const,
      title,
      subtitle: locationStr || description.slice(0, 50) || t('editor.travelMemory'),
      detailTitle: title,
      description,
      image: resolvedImages[0] ?? '',
      gallery: resolvedImages,
      color: '#3B82F6',
      chord: [0.2, 0.4, 0.6],
      category: t('editor.travelMemory'),
      richContent: generateRichContent(editorDataForHtml),
      editorBlocks: blocksToSave,
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
  }, [title, description, location, blocks, userId, router, editId, t]);

  const handleOpenAddPanel = useCallback(() => {
    setEditingBlock(null);
    setIsEditPanelOpen(true);
  }, []);

  // Use ref to read current blocks length without making callbacks depend on it
  const handleSelectType = useCallback((type: ContentBlockType['type']) => {
    const newBlock: ContentBlockType = {
      id: generateId(),
      type,
      content: '',
      order: blocksLengthRef.current,
    };
    setBlocks(prev => [...prev, newBlock]);
    setEditingBlock(newBlock);
    setSelectedBlockId(newBlock.id);
    setNewlyAddedBlockId(newBlock.id);
    if (type === 'text') {
      setIsEditPanelOpen(false);
    }
  }, []);

  const handleSelectCinematicTemplate = useCallback((layout: LayoutType) => {
    const newBlock: ContentBlockType = {
      id: generateId(),
      type: 'cinematic',
      content: '',
      order: blocksLengthRef.current,
      metadata: {
        cinematicLayout: layout,
        cinematicImage: getCinematicPlaceholderImage(),
      },
    };
    setBlocks(prev => [...prev, newBlock]);
    setEditingBlock(newBlock);
    setSelectedBlockId(newBlock.id);
    setNewlyAddedBlockId(newBlock.id);
  }, []);

  const handleSelectSectionTemplate = useCallback((templateId: SectionTemplateId) => {
    const newBlock: ContentBlockType = {
      id: generateId(),
      type: 'section',
      content: '',
      order: blocksLengthRef.current,
      metadata: {
        sectionTemplateId: templateId,
        sectionData: getDefaultSectionData(templateId),
      },
    };
    setBlocks(prev => [...prev, newBlock]);
    setEditingBlock(newBlock);
    setSelectedBlockId(newBlock.id);
    setNewlyAddedBlockId(newBlock.id);
    setIsEditPanelOpen(true);
  }, []);

  const handleInsertGeneratedContent = useCallback((html: string) => {
    const newBlock: ContentBlockType = {
      id: generateId(),
      type: 'richtext',
      content: html,
      order: blocksLengthRef.current,
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setIsEditPanelOpen(false);
    setEditingBlock(null);
  }, []);

  const handleInsertGeneratedBlocks = useCallback((aiBlocks: AIGeneratedDocBlock[], imageUrls: string[]) => {
    const baseOrder = blocksLengthRef.current;
    const newBlocks: ContentBlockType[] = aiBlocks.map((b, i) => {
      const id = generateId();
      const order = baseOrder + i;
      if (b.type === 'richtext') return { id, type: 'richtext', content: b.content ?? '', order };
      if (b.type === 'text') return { id, type: 'text', content: b.content ?? '', order };
      if (b.type === 'image') {
        const idx = Math.max(0, Math.min(b.imageIndex ?? 0, imageUrls.length - 1));
        const url = imageUrls[idx];
        return { id, type: 'image', content: url ?? '', order, metadata: { images: url ? [url] : [] } };
      }
      return { id, type: 'text', content: '', order };
    });
    setBlocks(prev => [...prev, ...newBlocks]);
    if (newBlocks.length > 0) setSelectedBlockId(newBlocks[0].id);
    setIsEditPanelOpen(false);
    setEditingBlock(null);
  }, []);

  const handleTextBlockChange = useCallback((blockId: string, content: string) => {
    setBlocks(prev =>
      prev.map(b => b.id === blockId ? { ...b, content } : b)
    );
  }, []);

  const handleBlockClick = useCallback((blockId: string) => {
    setSelectedBlockId((prev) => (prev === blockId ? prev : blockId));
  }, []);

  const handleDeselectBlocks = useCallback(() => {
    setSelectedBlockId(null);
  }, []);

  const handleEditBlock = useCallback((blockId: string) => {
    const block = blocksRef.current.find(b => b.id === blockId);
    if (block) {
      setEditingBlock(block);
      setNewlyAddedBlockId(null);
      setIsEditPanelOpen(true);
    }
  }, []);

  const handleSaveBlock = useCallback((updatedBlock: ContentBlockType) => {
    setNewlyAddedBlockId((prev) => (prev === updatedBlock.id ? null : prev));
    setBlocks(prev =>
      prev.map(b => b.id === updatedBlock.id ? updatedBlock : b)
    );
  }, []);

  const handleDeleteBlock = useCallback(() => {
    const block = editingBlockRef.current;
    if (!block) return;
    const shouldDelete = confirm(t('editor.confirmDeleteBlock'));
    if (shouldDelete) {
      setBlocks(prev => prev.filter(b => b.id !== block.id));
      setIsEditPanelOpen(false);
      setEditingBlock(null);
      setSelectedBlockId(null);
    }
  }, [t]);

  const handleCloseEditPanel = useCallback(() => {
    setIsEditPanelOpen(false);
    setEditingBlock(null);
    setEditingTarget(null);
    setNewlyAddedBlockId(null);
  }, []);

  const handleSaveTitle = useCallback((data: { title: string; titleStyle?: TitleStyle }) => {
    setTitle(data.title);
    setTitleStyle(data.titleStyle);
  }, []);

  const handleSaveDescription = useCallback((data: { description: string; descriptionStyle?: TitleStyle }) => {
    setDescription(data.description);
    setDescriptionStyle(data.descriptionStyle);
  }, []);

  const handleDiscardBlock = useCallback(() => {
    const block = editingBlockRef.current;
    if (!block) return;
    setBlocks(prev => prev.filter(b => b.id !== block.id));
    setSelectedBlockId(null);
    setIsEditPanelOpen(false);
    setEditingBlock(null);
  }, []);

  const handleCinematicBlockUpdate = useCallback((blockId: string, updates: Partial<StoryBlock>) => {
    setBlocks(prev =>
      prev.map(b => {
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
      })
    );
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
        <div className="px-8 pt-4 max-w-2xl mx-auto">
          <header className="space-y-2 text-center">
            <div
              className="relative"
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTitleFocused(false); }}
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setTitleFocused(true)}
                placeholder={t('editor.title')}
                className="w-full font-bold focus:outline-none bg-transparent placeholder:text-[#86868b]"
                style={{
                  fontSize: titleStyle?.fontSize === 'small' ? '1.25rem' : titleStyle?.fontSize === 'large' ? '1.75rem' : '1.5rem',
                  color: titleStyle?.textColor ?? '#1d1d1f',
                  textAlign: titleStyle?.textAlign ?? 'center',
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
                  className="absolute top-0 right-0 z-10 flex items-center gap-1 rounded-full pl-2.5 pr-2.5 py-1.5 text-[11px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 active:scale-[0.98]"
                  aria-label={t('editor.editTitle')}
                >
                  <Edit2 size={10} strokeWidth={2.5} />
                  <span>{t('common.edit')}</span>
                </button>
              )}
            </div>

            <div>
              <label htmlFor="editor-location" className="sr-only">
                {t('cinematic.location')}
              </label>
              <input
                id="editor-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('upload.locationPlaceholder')}
                className="w-full text-sm text-center text-[#86868b] focus:text-[#1d1d1f] focus:outline-none bg-transparent placeholder:text-[#86868b]"
                maxLength={120}
              />
            </div>

            <div
              className="relative"
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDescriptionFocused(false); }}
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setDescriptionFocused(true)}
                placeholder={t('editor.description')}
                className="w-full resize-none focus:outline-none bg-transparent rounded-xl py-2 placeholder:text-[#86868b] focus:bg-[#f5f5f7]/80 text-sm"
                style={{
                  minHeight: 56,
                  fontSize: descriptionStyle?.fontSize === 'small' ? 13 : descriptionStyle?.fontSize === 'large' ? 17 : 14,
                  color: descriptionStyle?.textColor ?? '#1d1d1f',
                  textAlign: descriptionStyle?.textAlign ?? 'center',
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
                  className="absolute top-0 right-0 z-10 flex items-center gap-1 rounded-full pl-2.5 pr-2.5 py-1.5 text-[11px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 active:scale-[0.98]"
                  aria-label={t('editor.editDescription')}
                >
                  <Edit2 size={10} strokeWidth={2.5} />
                  <span>{t('common.edit')}</span>
                </button>
              )}
            </div>
          </header>

          <div className="space-y-3">
            {sortedBlocks.map((block, index) => (
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

      <EditPanel
        isOpen={isEditPanelOpen}
        onClose={handleCloseEditPanel}
        block={editingBlock}
        isNewlyAddedBlock={editingBlock != null && editingBlock.id === newlyAddedBlockId}
        editingTarget={editingTarget}
        titleData={{ title, titleStyle }}
        descriptionData={{ description, descriptionStyle }}
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
