import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import { getAllStoredGalleryMedia } from '../utils/galleryStore';

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

// Built-in curated high-quality social media library
// Ensures user immediately finds rich photos and videos in gallery ready to select
const CURATED_DEFAULT_MEDIA: GalleryMediaItem[] = [
  {
    id: 'unera_v_1',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    duration: '0:15',
    durationSeconds: 15,
    name: 'Sunset Horizon Vibes',
  },
  {
    id: 'unera_img_1',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80',
    name: 'Urban Portrait',
  },
  {
    id: 'unera_v_2',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    duration: '0:24',
    durationSeconds: 24,
    name: 'Tropical Beach Escape',
  },
  {
    id: 'unera_img_2',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&auto=format&fit=crop&q=80',
    name: 'Golden Hour Smile',
  },
  {
    id: 'unera_v_3',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80',
    duration: '0:35',
    durationSeconds: 35,
    name: 'Festival Lights & Sound',
  },
  {
    id: 'unera_img_3',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&auto=format&fit=crop&q=80',
    name: 'Mountain Lake View',
  },
  {
    id: 'unera_img_4',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=900&auto=format&fit=crop&q=80',
    name: 'City Streets',
  },
  {
    id: 'unera_v_4',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    duration: '0:42',
    durationSeconds: 42,
    name: 'Studio Beat Session',
  },
  {
    id: 'unera_img_5',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&auto=format&fit=crop&q=80',
    name: 'Summer Fashion',
  },
  {
    id: 'unera_v_5',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80',
    duration: '1:05',
    durationSeconds: 65,
    name: 'Cinematic Visuals',
  },
  {
    id: 'unera_img_6',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&auto=format&fit=crop&q=80',
    name: 'Workspace Flow',
  },
  {
    id: 'unera_img_7',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&auto=format&fit=crop&q=80',
    name: 'Night DJ Club',
  },
  {
    id: 'unera_v_6',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80',
    duration: '0:54',
    durationSeconds: 54,
    name: 'Track & Sprint Training',
  },
  {
    id: 'unera_img_8',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=900&auto=format&fit=crop&q=80',
    name: 'Coffee & Chill',
  },
  {
    id: 'unera_img_9',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&auto=format&fit=crop&q=80',
    name: 'Nature Wandering',
  },
  {
    id: 'unera_v_7',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop&q=80',
    duration: '0:52',
    durationSeconds: 52,
    name: 'Fantasy Realm Story',
  },
  {
    id: 'unera_img_10',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&auto=format&fit=crop&q=80',
    name: 'Best Friends Gathering',
  },
  {
    id: 'unera_img_11',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&auto=format&fit=crop&q=80',
    name: 'Gentle Smile',
  },
];

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

  // Gallery items state
  const [galleryItems, setGalleryItems] = useState<GalleryMediaItem[]>([]);

  // Reset filter if initialFilter changes when opening
  useEffect(() => {
    if (isOpen) {
      setFilterMode(initialFilter);
    }
  }, [isOpen, initialFilter]);

  // Load photos and videos from app media, stored device IndexedDB, and curated catalog
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingMedia(true);

    const loadMedia = async () => {
      try {
        const seenUrls = new Set<string>();
        const loaded: GalleryMediaItem[] = [];

        // 1. IndexedDB device media (if user had saved any media in the session)
        const stored = await getAllStoredGalleryMedia();
        stored.forEach((item) => {
          if (item.url && !seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            loaded.push({
              id: item.id,
              type: item.type,
              url: item.url,
              duration: item.duration || (item.type === 'video' ? '0:30' : undefined),
              durationSeconds: item.durationSeconds || 30,
              name: item.name,
              size: item.size,
            });
          }
        });

        // 2. Real app posts and reels media
        const [postsRes, reelsRes] = await Promise.allSettled([
          apiFetch('/api/posts'),
          apiFetch('/api/reels'),
        ]);

        if (reelsRes.status === 'fulfilled' && reelsRes.value) {
          const rData = reelsRes.value;
          const reelsList = Array.isArray(rData) ? rData : rData?.reels || rData?.data || [];
          reelsList.forEach((reel: any) => {
            const vUrl = reel.video_url || reel.videoUrl || reel.video || reel.media_url;
            if (vUrl && typeof vUrl === 'string' && !seenUrls.has(vUrl)) {
              seenUrls.add(vUrl);
              loaded.push({
                id: `reel_${reel.id || Math.random()}`,
                type: 'video',
                url: vUrl,
                thumbnailUrl: reel.thumbnail_url || reel.thumbnail || reel.cover_url,
                name: reel.caption ? reel.caption.slice(0, 30) : reel.song_name || 'Reel Video',
                duration: reel.duration ? String(reel.duration) : '0:30',
                durationSeconds: 30,
              });
            }
          });
        }

        if (postsRes.status === 'fulfilled' && postsRes.value) {
          const pData = postsRes.value;
          const postsList = Array.isArray(pData) ? pData : pData?.posts || pData?.data || [];
          postsList.forEach((post: any) => {
            const vUrl = post.video_url || (post.media_type === 'video' ? post.media_url : null);
            if (vUrl && typeof vUrl === 'string' && !seenUrls.has(vUrl)) {
              seenUrls.add(vUrl);
              loaded.push({
                id: `post_v_${post.id || Math.random()}`,
                type: 'video',
                url: vUrl,
                thumbnailUrl: post.thumbnail_url,
                name: post.content ? post.content.slice(0, 30) : 'Video Post',
                duration: '0:30',
                durationSeconds: 30,
              });
            }

            const imgUrl = post.media_type === 'image' ? post.media_url : post.image_url;
            if (imgUrl && typeof imgUrl === 'string' && !seenUrls.has(imgUrl)) {
              seenUrls.add(imgUrl);
              loaded.push({
                id: `post_img_${post.id || Math.random()}`,
                type: 'image',
                url: imgUrl,
                name: post.content ? post.content.slice(0, 30) : 'Photo',
              });
            }

            if (Array.isArray(post.images)) {
              post.images.forEach((img: any, idx: number) => {
                const u = typeof img === 'string' ? img : img?.url;
                if (u && typeof u === 'string' && !seenUrls.has(u)) {
                  seenUrls.add(u);
                  loaded.push({
                    id: `post_img_${post.id}_${idx}`,
                    type: 'image',
                    url: u,
                    name: `Photo ${idx + 1}`,
                  });
                }
              });
            }
          });
        }

        // 3. Merge curated default library to ensure rich choice
        CURATED_DEFAULT_MEDIA.forEach((item) => {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            loaded.push(item);
          }
        });

        if (isMounted) {
          setGalleryItems(loaded);
          if (loaded.length > 0) {
            setActivePreviewId(loaded[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not load gallery media:', err);
        if (isMounted) {
          setGalleryItems(CURATED_DEFAULT_MEDIA);
          setActivePreviewId(CURATED_DEFAULT_MEDIA[0].id);
        }
      } finally {
        if (isMounted) setIsLoadingMedia(false);
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filter items based on active tab
  const filteredItems = useMemo(() => {
    return galleryItems.filter((item) => {
      if (filterMode === 'videos') return item.type === 'video';
      if (filterMode === 'photos') return item.type === 'image';
      return true;
    });
  }, [galleryItems, filterMode]);

  // Item counts for filter tabs
  const videoCount = useMemo(
    () => galleryItems.filter((i) => i.type === 'video').length,
    [galleryItems]
  );
  const photoCount = useMemo(
    () => galleryItems.filter((i) => i.type === 'image').length,
    [galleryItems]
  );

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

  return (
    <div
      className="fixed inset-0 z-[250] bg-[#050B18] flex flex-col font-sans select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Media Gallery"
    >
      {/* 1. TOP NAVIGATION HEADER (Facebook & TikTok style) */}
      <header className="h-14 bg-[#0B1120] border-b border-[#1E293B] px-3.5 flex items-center justify-between flex-shrink-0 z-30">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-[#1E293B]/80 hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
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

        {/* Next / Proceed Button (Top right) */}
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
      </header>

      {/* 2. LIVE PREVIEW BAR (Compact, responsive, displays currently focused media) */}
      <div className="relative w-full aspect-[16/9] max-h-[260px] sm:max-h-[320px] bg-black flex items-center justify-center overflow-hidden flex-shrink-0 border-b border-[#1E293B]">
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
          <div className="flex flex-col items-center justify-center text-[#64748B]">
            <i className="fas fa-photo-video text-2xl mb-1.5 text-[#334155]"></i>
            <span className="text-xs">Tap any photo or video to preview</span>
          </div>
        )}

        {/* Active item type badge */}
        {activePreviewItem && (
          <div className="absolute top-2.5 left-2.5 bg-black/65 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] text-white flex items-center gap-1.5 border border-white/10 pointer-events-none">
            <i
              className={`fas fa-${
                activePreviewItem.type === 'video' ? 'video text-[#38BDF8]' : 'image text-[#10B981]'
              } text-[10px]`}
            ></i>
            <span className="capitalize font-medium">{activePreviewItem.type}</span>
            {activePreviewItem.duration && (
              <span className="text-[#94A3B8]">• {activePreviewItem.duration}</span>
            )}
          </div>
        )}

        {/* Quick select/unselect button on active preview */}
        {activePreviewItem && (
          <button
            type="button"
            onClick={() => handleItemToggle(activePreviewItem)}
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-white border border-white/20 transition-all cursor-pointer"
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

      {/* 3. MEDIA GRID (Clean, full width, compact professional spacing, 1, 2, 3... numbered badges) */}
      <div className="flex-1 overflow-y-auto bg-[#050B18]">
        {isLoadingMedia ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#94A3B8]">
            <i className="fas fa-spinner fa-spin text-2xl text-[#1877F2] mb-2"></i>
            <span className="text-xs">Loading media gallery…</span>
          </div>
        ) : (
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
                          // Fallback if video tag thumbnail
                          e.target.style.display = 'none';
                        }}
                      />
                      {/* Video Camera Icon + Duration Badge (Distinct video indicator) */}
                      <div className="absolute bottom-1 left-1 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1 border border-white/10 font-semibold pointer-events-none shadow-sm">
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
                      <div className="w-6 h-6 rounded-full border-2 border-white/80 bg-black/35 backdrop-blur-sm group-hover:border-white transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoadingMedia && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#94A3B8]">
            <i className="fas fa-images text-3xl mb-2 text-[#334155]"></i>
            <span className="text-sm font-semibold text-[#F8FAFC]">No media in this folder</span>
            <span className="text-xs text-[#64748B] mt-1">Switch to All to browse all photos and videos</span>
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
