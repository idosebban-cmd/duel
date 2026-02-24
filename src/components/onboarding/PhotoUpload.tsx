import { useState, useRef, useCallback } from 'react';
import type { DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Camera, AlertCircle } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';

const MAX_PHOTOS = 5;
const MIN_PHOTOS = 2;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PhotoSlot {
  id: string;
  dataUrl: string;
  name: string;
}

export function PhotoUpload() {
  const navigate = useNavigate();
  const { photos: storedPhotos, updatePhotos, completeStep } = useOnboardingStore();

  const [photos, setPhotos] = useState<PhotoSlot[]>(
    storedPhotos.map((url, i) => ({ id: `stored-${i}`, dataUrl: url, name: `Photo ${i + 1}` }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name}: Invalid file type (JPG, PNG, WEBP only)`;
    if (file.size > MAX_FILE_SIZE) return `${file.name}: File too large (max 10MB)`;
    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const newErrors: string[] = [];

    const available = MAX_PHOTOS - photos.length;
    const toProcess = fileArr.slice(0, available);

    if (fileArr.length > available) {
      newErrors.push(`Only ${available} more photo${available !== 1 ? 's' : ''} allowed (max ${MAX_PHOTOS})`);
    }

    const newPhotos: PhotoSlot[] = [];

    for (const file of toProcess) {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
        continue;
      }
      const dataUrl = await readFileAsDataURL(file);
      newPhotos.push({ id: `${Date.now()}-${Math.random()}`, dataUrl, name: file.name });
    }

    setErrors(newErrors);
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, [photos.length]);

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setDragOverIndex(null);

    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Reorder via drag
  const handlePhotoReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleContinue = () => {
    updatePhotos(photos.map((p) => p.dataUrl));
    completeStep(3);
    navigate('/onboarding/games');
  };

  const canContinue = photos.length >= MIN_PHOTOS;

  // Build the grid: always show 5 slots
  const slots = [
    ...photos,
    ...Array(MAX_PHOTOS - photos.length).fill(null),
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFF0F5 60%, #F5F0FF 100%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center px-4 sm:px-6 py-4 gap-4">
        <motion.button
          onClick={() => navigate('/onboarding/basics')}
          className="flex items-center gap-1.5 text-charcoal/60 font-body font-medium hover:text-charcoal transition-colors flex-shrink-0"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </motion.button>

        <div className="flex-1 text-center">
          <span className="font-display font-bold text-sm text-charcoal/50 tracking-widest uppercase">
            Photos
          </span>
          <div className="flex gap-1 mt-1.5 justify-center">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  width: i === 3 ? 24 : 8,
                  background: i <= 3
                    ? 'linear-gradient(90deg, #FF6BA8, #B565FF)'
                    : '#e5e7eb',
                }}
              />
            ))}
          </div>
        </div>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2
              className="font-display font-extrabold text-3xl sm:text-4xl mb-2"
              style={{
                background: 'linear-gradient(135deg, #FF9F1C, #FF3D71)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ADD YOUR PHOTOS
            </h2>
            <p className="font-body text-base text-charcoal/60">
              Upload {MIN_PHOTOS}–{MAX_PHOTOS} photos. First one is your main pic.
            </p>
          </motion.div>

          {/* Photo Grid */}
          <div
            className="relative"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
          >
            {/* Drag overlay */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  className="absolute inset-0 z-10 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255, 107, 168, 0.1)',
                    border: '3px dashed #FF6BA8',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="font-display font-bold text-hot-bubblegum text-lg">Drop photos here!</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main photo (large) + 4 smaller */}
            <div className="grid grid-cols-3 gap-3">
              {/* Main photo - spans 2 rows */}
              <div className="col-span-2 row-span-2">
                {slots[0] ? (
                  <PhotoCard
                    photo={slots[0]}
                    index={0}
                    isMain={true}
                    onRemove={() => removePhoto(slots[0]!.id)}
                    onDragStart={() => setDragSourceIndex(0)}
                    onDragOver={() => setDragOverIndex(0)}
                    onDrop={() => {
                      if (dragSourceIndex !== null) handlePhotoReorder(dragSourceIndex, 0);
                      setDragSourceIndex(null);
                      setDragOverIndex(null);
                    }}
                    isDragOver={dragOverIndex === 0}
                  />
                ) : (
                  <EmptySlot
                    isMain={true}
                    onClick={() => fileInputRef.current?.click()}
                  />
                )}
              </div>

              {/* 4 smaller slots */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square">
                  {slots[i] ? (
                    <PhotoCard
                      photo={slots[i]!}
                      index={i}
                      isMain={false}
                      onRemove={() => removePhoto(slots[i]!.id)}
                      onDragStart={() => setDragSourceIndex(i)}
                      onDragOver={() => setDragOverIndex(i)}
                      onDrop={() => {
                        if (dragSourceIndex !== null) handlePhotoReorder(dragSourceIndex, i);
                        setDragSourceIndex(null);
                        setDragOverIndex(null);
                      }}
                      isDragOver={dragOverIndex === i}
                    />
                  ) : (
                    <EmptySlot
                      isMain={false}
                      onClick={photos.length < MAX_PHOTOS ? () => fileInputRef.current?.click() : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            className="hidden"
            aria-label="Upload photos"
          />

          {/* Upload button */}
          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
            className="mt-4 w-full py-3 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2"
            style={{
              background: photos.length < MAX_PHOTOS ? 'white' : '#f5f5f5',
              border: '3px dashed #FF6BA8',
              color: photos.length < MAX_PHOTOS ? '#FF6BA8' : '#9ca3af',
              cursor: photos.length < MAX_PHOTOS ? 'pointer' : 'not-allowed',
            }}
            whileHover={photos.length < MAX_PHOTOS ? { scale: 1.02 } : {}}
            whileTap={photos.length < MAX_PHOTOS ? { scale: 0.98 } : {}}
          >
            <Plus size={18} />
            {photos.length >= MAX_PHOTOS ? 'Max photos reached' : 'Add More Photos'}
          </motion.button>

          {/* Counter */}
          <div className="flex justify-between items-center mt-3">
            <p className="font-body text-sm text-charcoal/50">
              {photos.length} / {MAX_PHOTOS} photos
            </p>
            {photos.length < MIN_PHOTOS && (
              <p className="font-body text-sm text-cherry-punch flex items-center gap-1">
                <AlertCircle size={14} />
                Add at least {MIN_PHOTOS - photos.length} more
              </p>
            )}
            {photos.length >= MIN_PHOTOS && (
              <p className="font-body text-sm text-electric-mint font-medium">✓ Ready to continue</p>
            )}
          </div>

          {/* Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                className="mt-3 p-3 rounded-xl bg-cherry-punch/10 border-2 border-cherry-punch/30"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {errors.map((err, i) => (
                  <p key={i} className="text-sm text-cherry-punch font-body flex items-center gap-1">
                    <AlertCircle size={14} />
                    {err}
                  </p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guidelines */}
          <div className="mt-6 p-4 rounded-2xl bg-white border-3 border-black/10">
            <p className="font-display font-bold text-sm text-charcoal/60 mb-2 flex items-center gap-2">
              <Camera size={16} />
              Photo Tips
            </p>
            <ul className="space-y-1">
              {[
                'Show your face clearly',
                'Full body shots work great',
                'Be yourself!',
                'JPG, PNG or WEBP · Max 10MB each',
              ].map((tip) => (
                <li key={tip} className="text-xs font-body text-charcoal/50 flex items-center gap-2">
                  <span className="text-electric-mint">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 sm:px-6 py-6 border-t border-black/5 bg-cream/80 backdrop-blur-sm">
        <motion.button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full max-w-lg mx-auto block font-display font-extrabold text-xl text-white rounded-2xl py-4 px-8 relative overflow-hidden"
          style={{
            background: canContinue
              ? 'linear-gradient(135deg, #FF9F1C 0%, #FF3D71 100%)'
              : '#d1d5db',
            border: '4px solid black',
            boxShadow: canContinue ? '8px 8px 0px 0px #4EFFC4' : 'none',
            cursor: canContinue ? 'pointer' : 'not-allowed',
            textShadow: canContinue ? '1px 1px 0 rgba(0,0,0,0.2)' : 'none',
          }}
          whileHover={canContinue ? { scale: 1.02, boxShadow: '10px 10px 0px 0px #4EFFC4' } : {}}
          whileTap={canContinue ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {canContinue && (
            <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          )}
          Continue →
        </motion.button>
      </div>
    </div>
  );
}

// Photo card component
function PhotoCard({
  photo,
  index,
  isMain,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  photo: PhotoSlot;
  index: number;
  isMain: boolean;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  isDragOver: boolean;
}) {
  return (
    <motion.div
      className={`relative w-full rounded-2xl overflow-hidden border-3 border-black group ${
        isMain ? 'aspect-[3/4]' : 'aspect-square'
      }`}
      style={{
        boxShadow: isDragOver
          ? '0 0 0 3px #FF6BA8, 0 0 20px rgba(255,107,168,0.5)'
          : '4px 4px 0px 0px rgba(0,0,0,0.2)',
      }}
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <img
        src={photo.dataUrl}
        alt={`Photo ${index + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Main photo badge */}
      {isMain && (
        <div
          className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-display font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #FF6BA8, #B565FF)', border: '2px solid black' }}
        >
          ⭐ MAIN
        </div>
      )}

      {/* Remove button */}
      <motion.button
        onClick={onRemove}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Remove photo"
      >
        <X size={14} />
      </motion.button>

      {/* Drag handle hint */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="px-2 py-0.5 rounded bg-black/60 text-white text-xs font-body">
          Drag to reorder
        </span>
      </div>
    </motion.div>
  );
}

// Empty slot component
function EmptySlot({
  isMain,
  onClick,
}: {
  isMain: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex flex-col items-center justify-center rounded-2xl transition-all ${
        isMain ? 'aspect-[3/4]' : 'aspect-square'
      }`}
      style={{
        border: '3px dashed #FF6BA8',
        background: 'rgba(255, 107, 168, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      whileHover={onClick ? { scale: 1.02, background: 'rgba(255, 107, 168, 0.1)' } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
        style={{ background: 'rgba(255, 107, 168, 0.15)' }}
      >
        <Plus size={isMain ? 22 : 16} className="text-hot-bubblegum" />
      </div>
      {isMain && (
        <span className="font-body text-xs text-hot-bubblegum/70 font-medium">
          Add Photo
        </span>
      )}
    </motion.button>
  );
}

