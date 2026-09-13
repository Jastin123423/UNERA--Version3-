import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch } from '../utils/api';
import {
  getAllStoredGalleryMedia,
  saveGalleryMediaItems,
  processLiveMediaFile,
  deleteStoredGalleryItem,
  StoredGalleryItem,
} from '../utils/galleryStore';

export interface GalleryMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  file?: File;
  duration?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  name?: string;
  size?: number;
  isFromDevice?: boolean;
}

export interface AttachedMusic {
  id?: number | string;
  title: string;
  artist?: string;
  audioUrl: string;
  duration?: number | string;
}

interface NativeMediaGalleryModalProps {
  isOpen: boolean;
  currentUser: any;
  songs?: any[];
  initialFilter?: 'all' | 'videos' | 'photos';
  onClose: () => void;
  onProceed: (data: {
    files: File[];
    mediaUrls: string[];
    mediaType: 'image' | 'video' | 'mixed';
    attachedMusic: AttachedMusic | null;
    items: GalleryMediaItem[];
  }) => void;
  onOpenCamera?: () => void;
}

// Helper to filter out fake or dummy sample URLs
function isRealMediaUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  // Filter out any known sample/mock test video URLs
  if (lower.includes('gtv-videos-bucket/sample')) return false;
  if (lower.includes('commondatastorage.googleapis.com/gtv-videos')) return false;
  if (lower.includes('sample/forbigger')) return false;
  if (lower.includes('sample/sintel')) return false;
  if (lower.includes('sample/tearsofsteel')) return false;
  return true;
}

export const NativeMediaGalleryModal: React.FC<NativeMediaGalleryModalProps> = ({
  isOpen,
  currentUser,
  songs = [],
  initialFilter = 'all',
  onClose,
  onProceed,
  onOpenCamera,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'videos' | 'photos'>(initialFilter);
  // Ordered array of selected item IDs: index corresponds to 1, 2, 3...
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Gallery items state (strictly live phone files & real user uploads)
  const [galleryItems, setGalleryItems] = useState<GalleryMediaItem[]>([]);

  // Hidden native phone inputs
  const phoneFileInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);

  // Reset filter if initialFilter changes when opening
  useEffect(() => {
    if (isOpen) {
      setFilterMode(initialFilter);
    }
  }, [isOpen, initialFilter]);

  // Load live media: stored device media from phone + real user posts/reels from API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingMedia(true);

    const loadLiveMedia = async () => {
      try {
        const seenUrls = new Set<string>();
        const loaded: GalleryMediaItem[] = [];

        // 1. Live phone/device media saved in IndexedDB
        const stored = await getAllStoredGalleryMedia();
        stored.forEach((item) => {
          if (item.url && !seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            loaded.push({
              id: item.id,
              type: item.type,
              url: item.url,
              file: item.file,
              thumbnailUrl: item.thumbnailUrl,
              duration: item.duration || (item.type === 'video' ? '0:30' : undefined),
              durationSeconds: item.durationSeconds || 30,
              name: item.name,
              size: item.size,
              isFromDevice: true,
            });
          }
        });

        // 2. Real user posts and reels media from live backend
        const [postsRes, reelsRes] = await Promise.allSettled([
          apiFetch('/api/posts'),
          apiFetch('/api/reels'),
        ]);

        if (reelsRes.status === 'fulfilled' && reelsRes.value) {
          const rData = reelsRes.value;
          const reelsList = Array.isArray(rData) ? rData : rData?.reels || rData?.data || [];
          reelsList.forEach((reel: any) => {
            const vUrl = reel.video_url || reel.videoUrl || reel.video || reel.media_url;
            if (isRealMediaUrl(vUrl) && !seenUrls.has(vUrl)) {
              seenUrls.add(vUrl);
              loaded.push({
                id: `reel_${reel.id || Math.random()}`,
                type: 'video',
                url: vUrl,
                thumbnailUrl: isRealMediaUrl(reel.thumbnail_url) ? reel.thumbnail_url : undefined,
                name: reel.caption ? reel.caption.slice(0, 30) : reel.song_name || 'Live Video',
                duration: reel.duration ? String(reel.duration) : '0:30',
                durationSeconds: 30,
                isFromDevice: false,
              });
            }
          });
        }

        if (postsRes.status === 'fulfilled' && postsRes.value) {
          const pData = postsRes.value;
          const postsList = Array.isArray(pData) ? pData : pData?.posts || pData?.data || [];
          postsList.forEach((post: any) => {
            const vUrl = post.video_url || (post.media_type === 'video' ? post.media_url : null);
            if (isRealMediaUrl(vUrl) && !seenUrls.has(vUrl)) {
              seenUrls.add(vUrl);
              loaded.push({
                id: `post_v_${post.id || Math.random()}`,
                type: 'video',
                url: vUrl,
                thumbnailUrl: isRealMediaUrl(post.thumbnail_url) ? post.thumbnail_url : undefined,
                name: post.content ? post.content.slice(0, 30) : 'Live Video',
                duration: '0:30',
                durationSeconds: 30,
                isFromDevice: false,
              });
            }

            const imgUrl = post.media_type === 'image' ? post.media_url : post.image_url;
            if (isRealMediaUrl(imgUrl) && !seenUrls.has(imgUrl)) {
              seenUrls.add(imgUrl);
              loaded.push({
                id: `post_img_${post.id || Math.random()}`,
                type: 'image',
                url: imgUrl,
                name: post.content ? post.content.slice(0, 30) : 'Live Photo',
                isFromDevice: false,
              });
            }

            if (Array.isArray(post.images)) {
              post.images.forEach((img: any, idx: number) => {
                const u = typeof img === 'string' ? img : img?.url;
                if (isRealMediaUrl(u) && !seenUrls.has(u)) {
                  seenUrls.add(u);
                  loaded.push({
                    id: `post_img_${post.id}_${idx}`,
                    type: 'image',
                    url: u,
                    name: `Photo ${idx + 1}`,
                    isFromDevice: false,
                  });
                }
              });
            }
          });
        }

        if (isMounted) {
          setGalleryItems(loaded);
          if (loaded.length > 0) {
            setActivePreviewId(loaded[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not load live media:', err);
      } finally {
        if (isMounted) setIsLoadingMedia(false);
      }
    };

    loadLiveMedia();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle files selected directly from phone gallery / camera
  const handlePhoneFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const fileList: File[] = Array.from(rawFiles);
    setIsProcessingFiles(true);
    setProcessingStatus(`Importing ${fileList.length} item${fileList.length > 1 ? 's' : ''} from phone…`);

    try {
      const processedList: StoredGalleryItem[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setProcessingStatus(`Reading ${file.name} (${i + 1}/${fileList.length})…`);
        const item = await processLiveMediaFile(file);
        processedList.push(item);
      }

      // Save real phone items to IndexedDB
      await saveGalleryMediaItems(processedList);

      // Convert to GalleryMediaItem and prepend to gallery list
      const newGalleryItems: GalleryMediaItem[] = processedList.map((item) => ({
        id: item.id,
        type: item.type,
        url: item.url,
        file: item.file,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        durationSeconds: item.durationSeconds,
        name: item.name,
        size: item.size,
        isFromDevice: true,
      }));

      setGalleryItems((prev) => [...newGalleryItems, ...prev]);

      // Automatically select newly imported phone items in order 1, 2, 3...
      const newIds = newGalleryItems.map((item) => item.id);
      setSelectedIds((prev) => [...prev, ...newIds]);
      if (newGalleryItems.length > 0) {
        setActivePreviewId(newGalleryItems[0].id);
      }
    } catch (err) {
      console.error('Error importing phone media:', err);
    } finally {
      setIsProcessingFiles(false);
      setProcessingStatus('');
      // Clear input so selecting the same file again triggers onChange
      e.target.value = '';
    }
  };

  // Delete an item from local device gallery
  const handleDeleteItem = async (item: GalleryMediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteStoredGalleryItem(item.id);
      setGalleryItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      if (activePreviewId === item.id) {
        setActivePreviewId(null);
      }
    } catch (err) {
      console.warn('Failed to delete item:', err);
    }
  };

  // Filter items based on active tab (all / videos / photos)
  const filteredItems = useMemo(() => {
    return galleryItems.filter((item) => {
      if (filterMode === 'videos') return item.type === 'video';
      if (filterMode === 'photos') return item.type === 'image';
      return true;
    });
  }, [galleryItems, filterMode]);

  // Active preview item
  const activePreviewItem = useMemo(() => {
    if (!activePreviewId) return filteredItems[0] || null;
    return galleryItems.find((i) => i.id === activePreviewId) || filteredItems[0] || null;
  }, [galleryItems, activePreviewId, filteredItems]);

  // Toggle selection of a media item with 1, 2, 3... ordering
  const handleItemToggle = (item: GalleryMediaItem) => {
    setActivePreviewId(item.id);

    setSelectedIds((prev) => {
      if (prev.includes(item.id)) {
        // Remove item: automatically re-indexes remaining items 1, 2, 3...
        return prev.filter((id) => id !== item.id);
      } else {
        // Add to end of selection list (next number in sequence)
        return [...prev, item.id];
      }
    });
  };

  // Quick remove from bottom selection bar
  const handleRemoveSelected = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  // Selected items objects in exact sequence 1, 2, 3...
  const selectedItems = useMemo(() => {
    return selectedIds
      .map((id) => galleryItems.find((i) => i.id === id))
      .filter((i): i is GalleryMediaItem => Boolean(i));
  }, [selectedIds, galleryItems]);

  // Handle proceed: hand off to Post Composer (Short Journey)
  const handleProceed = () => {
    if (selectedItems.length === 0) return;

    const files: File[] = [];
    const mediaUrls: string[] = [];
    let hasVideo = false;
    let hasImage = false;

    selectedItems.forEach((item) => {
      if (item.file) {
        files.push(item.file);
      }
      mediaUrls.push(item.url);
      if (item.type === 'video') hasVideo = true;
      if (item.type === 'image') hasImage = true;
    });

    const mediaType: 'image' | 'video' | 'mixed' =
      hasVideo && hasImage ? 'mixed' : hasVideo ? 'video' : 'image';

    onProceed({
      files,
      mediaUrls,
      mediaType,
      attachedMusic: null,
      items: selectedItems,
    });
  };

  if (!isOpen) return null;

  // Accept attribute based on current filter tab
  const fileInputAccept =
    filterMode === 'videos' ? 'video/*' : filterMode === 'photos' ? 'image/*' : 'image/*,video/*';

  return (
    <div
      className="fixed inset-0 z-[250] bg-[#050B18] flex flex-col font-sans select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Live Phone Media Gallery"
    >
      {/* Hidden File Inputs for Live Device & Camera Access */}
      <input
        type="file"
        ref={phoneFileInputRef}
        accept={fileInputAccept}
        multiple
        className="hidden"
        onChange={handlePhoneFilesSelected}
      />
      <input
        type="file"
        ref={cameraPhotoInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhoneFilesSelected}
      />
      <input
        type="file"
        ref={cameraVideoInputRef}
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handlePhoneFilesSelected}
      />

      {/* 1. TOP NAVIGATION HEADER (Facebook & TikTok style) */}
      <header className="h-14 bg-[#0B1120] border-b border-[#1E293B] px-3 sm:px-4 flex items-center justify-between flex-shrink-0 z-30 gap-2">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-[#1E293B]/80 hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          aria-label="Close media gallery"
        >
          <i className="fas fa-times text-base"></i>
        </button>

        {/* Filter Pills (All / Videos / Photos) */}
        <div className="flex items-center bg-[#050B18] p-1 rounded-full border border-[#1E293B]">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#1877F2] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('videos')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterMode === 'videos'
                ? 'bg-[#1877F2] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <i className="fas fa-video text-[10px]"></i>
            <span>Videos</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('photos')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterMode === 'photos'
                ? 'bg-[#1877F2] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <i className="fas fa-image text-[10px]"></i>
            <span>Photos</span>
          </button>
        </div>

        {/* Live Device Import & Next Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Select from Phone Gallery button */}
          <button
            type="button"
            onClick={() => phoneFileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-[#1E293B] hover:bg-[#334155] active:scale-95 text-[#38BDF8] border border-[#38BDF8]/30 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Choose live photos and videos from phone"
          >
            <i className="fas fa-mobile-alt text-xs"></i>
            <span className="hidden sm:inline">From Phone</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenCamera) {
                onOpenCamera();
              } else if (filterMode === 'videos') {
                cameraVideoInputRef.current?.click();
              } else {
                cameraPhotoInputRef.current?.click();
              }
            }}
            className="w-8 h-8 rounded-full bg-[#1E293B] hover:bg-[#334155] active:scale-95 text-[#10B981] border border-[#10B981]/30 flex items-center justify-center transition-all cursor-pointer"
            title="Take photo or video with camera"
          >
            <i className="fas fa-camera text-xs"></i>
          </button>

          {/* Next / Proceed Button */}
          <button
            type="button"
            onClick={handleProceed}
            disabled={selectedItems.length === 0}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedItems.length > 0
                ? 'bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-md shadow-[#1877F2]/30 active:scale-95'
                : 'bg-[#1E293B] text-[#64748B] cursor-not-allowed opacity-60'
            }`}
          >
            <span>Next</span>
            {selectedItems.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#1877F2] text-[10px] font-black flex items-center justify-center">
                {selectedItems.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Live Processing Overlay when reading phone files */}
      {isProcessingFiles && (
        <div className="bg-[#1877F2]/20 border-b border-[#1877F2]/40 px-4 py-2 flex items-center justify-center gap-2 text-xs text-[#38BDF8] z-20 animate-pulse">
          <i className="fas fa-circle-notch fa-spin text-sm"></i>
          <span>{processingStatus || 'Importing live media from phone…'}</span>
        </div>
      )}

      {/* 2. LIVE PREVIEW BAR (Displays currently focused media) */}
      <div className="relative w-full aspect-[16/9] max-h-[250px] sm:max-h-[300px] bg-black flex items-center justify-center overflow-hidden flex-shrink-0 border-b border-[#1E293B]">
        {activePreviewItem ? (
          activePreviewItem.type === 'video' ? (
            <video
              key={activePreviewItem.id}
              src={activePreviewItem.url}
              poster={activePreviewItem.thumbnailUrl}
              controls
              playsInline
              loop
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              key={activePreviewItem.id}
              src={activePreviewItem.url}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-[#64748B] p-4 text-center">
            <i className="fas fa-photo-video text-3xl mb-2 text-[#334155]"></i>
            <span className="text-xs text-[#94A3B8] font-medium">Select or import photos & videos from your phone</span>
            <button
              type="button"
              onClick={() => phoneFileInputRef.current?.click()}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-semibold rounded-full shadow-sm cursor-pointer"
            >
              <i className="fas fa-plus text-[10px]"></i>
              <span>Select from Phone</span>
            </button>
          </div>
        )}

        {/* Active item type badge */}
        {activePreviewItem && (
          <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-white flex items-center gap-1.5 border border-white/10 pointer-events-none">
            <i
              className={`fas fa-${
                activePreviewItem.type === 'video' ? 'video text-[#38BDF8]' : 'image text-[#10B981]'
              } text-[10px]`}
            ></i>
            <span className="capitalize font-medium">{activePreviewItem.type}</span>
            {activePreviewItem.duration && (
              <span className="text-[#94A3B8]">• {activePreviewItem.duration}</span>
            )}
            {activePreviewItem.isFromDevice && (
              <span className="text-[#38BDF8] ml-1 bg-[#38BDF8]/10 px-1.5 py-0.2 rounded text-[9px] font-bold">
                Phone Media
              </span>
            )}
          </div>
        )}

        {/* Quick select/unselect button on active preview */}
        {activePreviewItem && (
          <button
            type="button"
            onClick={() => handleItemToggle(activePreviewItem)}
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/65 hover:bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-white border border-white/20 transition-all cursor-pointer"
          >
            {selectedIds.includes(activePreviewItem.id) ? (
              <>
                <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white text-[10px] font-bold flex items-center justify-center">
                  {selectedIds.indexOf(activePreviewItem.id) + 1}
                </span>
                <span>Selected</span>
              </>
            ) : (
              <>
                <span className="w-4 h-4 rounded-full border border-white/70"></span>
                <span>Select</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. MEDIA GRID (Clean, full width, compact spacing, 1, 2, 3... numbered badges) */}
      <div className="flex-1 overflow-y-auto bg-[#050B18]">
        {isLoadingMedia ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#94A3B8]">
            <i className="fas fa-spinner fa-spin text-2xl text-[#1877F2] mb-2"></i>
            <span className="text-xs">Loading live media…</span>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-[2px] bg-[#050B18] p-[2px]">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const selectionIndex = selectedIds.indexOf(item.id) + 1;
              const isFocused = activePreviewId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemToggle(item)}
                  className={`relative aspect-square bg-[#0F172A] overflow-hidden cursor-pointer group transition-all select-none ${
                    isSelected
                      ? 'ring-2 ring-inset ring-[#1877F2]'
                      : isFocused
                      ? 'ring-1 ring-inset ring-white/40'
                      : 'hover:opacity-90'
                  }`}
                >
                  {/* Thumbnail */}
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-black relative flex items-center justify-center">
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                        loading="lazy"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      {/* Video Camera Icon + Duration Badge */}
                      <div className="absolute bottom-1 left-1 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1 border border-white/10 font-semibold pointer-events-none shadow-sm">
                        <i className="fas fa-video text-[8px] text-[#38BDF8]"></i>
                        <span>{item.duration || '0:30'}</span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.name || 'Photo'}
                      className="w-full h-full object-cover pointer-events-none"
                      loading="lazy"
                    />
                  )}

                  {/* Dark subtle overlay if selected */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#1877F2]/15 pointer-events-none" />
                  )}

                  {/* Top-Right Numbered Badge: 1, 2, 3... */}
                  <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#1877F2] border-2 border-white text-white text-[11px] font-bold flex items-center justify-center shadow-lg transform scale-105 transition-transform animate-scale-in">
                        {selectionIndex}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm group-hover:border-white transition-colors" />
                    )}
                  </div>

                  {/* Delete button for device-stored items */}
                  {item.isFromDevice && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item, e)}
                      className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                      title="Remove from device list"
                    >
                      <i className="fas fa-trash-alt text-[10px]"></i>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Live Empty State: Direct Call to Phone Gallery */
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#94A3B8] h-full min-h-[300px]">
            <div className="w-16 h-16 rounded-2xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-3xl text-[#38BDF8] mb-4 shadow-lg shadow-black/40">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Live Phone Photos & Videos</h3>
            <p className="text-xs text-[#64748B] max-w-xs mt-1.5 mb-5 leading-relaxed">
              No fake data. Tap below to fetch live pictures and videos directly from your phone gallery.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => phoneFileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-[#1877F2] hover:bg-[#166FE5] active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#1877F2]/30 cursor-pointer transition-all"
              >
                <i className="fas fa-folder-open text-sm"></i>
                <span>Open Phone Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenCamera) {
                    onOpenCamera();
                  } else if (filterMode === 'videos') {
                    cameraVideoInputRef.current?.click();
                  } else {
                    cameraPhotoInputRef.current?.click();
                  }
                }}
                className="w-full py-2.5 px-4 bg-[#1E293B] hover:bg-[#334155] active:scale-98 text-[#CBD5E1] border border-[#334155] rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <i className="fas fa-camera text-sm text-[#10B981]"></i>
                <span>Take Photo / Video</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MOBILE-OPTIMIZED ONE-HANDED BOTTOM ACTION TRAY */}
      {selectedItems.length > 0 && (
        <div className="bg-[#0B1120] border-t border-[#1E293B] px-3.5 py-2.5 flex items-center justify-between gap-3 flex-shrink-0 z-30 animate-slide-up">
          {/* Selected Thumbnail Chips in Order 1, 2, 3... */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[62%] sm:max-w-[70%] scrollbar-hide">
            {selectedItems.map((item, idx) => (
              <div
                key={item.id}
                className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-[#1877F2] group cursor-pointer"
                onClick={() => setActivePreviewId(item.id)}
              >
                <img
                  src={item.thumbnailUrl || item.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {/* Number tag */}
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#1877F2] text-white text-[9px] font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                {/* Quick remove cross */}
                <button
                  type="button"
                  onClick={(e) => handleRemoveSelected(item.id, e)}
                  className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            ))}
          </div>

          {/* Add to Post Button (One-handed friendly touch target) */}
          <button
            type="button"
            onClick={handleProceed}
            className="flex-1 max-w-[170px] bg-[#1877F2] hover:bg-[#166FE5] active:scale-98 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg shadow-[#1877F2]/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Add to Post</span>
            <span className="w-5 h-5 rounded-full bg-white text-[#1877F2] text-[11px] font-black flex items-center justify-center">
              {selectedItems.length}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
