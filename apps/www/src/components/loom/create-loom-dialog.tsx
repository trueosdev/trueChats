"use client"

import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, Search, X, Globe, Lock, Mail, Upload, Camera, Trash2, Loader2, RotateCcw } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '../ui/button'
import { createLoom, uploadLoomIcon } from '@/lib/services/looms'
import { useAuth } from '@/hooks/useAuth'
import type { LoomVisibility } from '@/app/data'

const LOOM_ICONS = [
  'Users', 'UsersRound', 'MessageCircle', 'MessagesSquare', 'LineSquiggle',
  'Heart', 'Star', 'Crown', 'Trophy', 'Award',
  'Coffee', 'Pizza', 'Gamepad2', 'Music', 'Headphones',
  'Briefcase', 'GraduationCap', 'Building', 'School',
  'Home', 'Camera', 'Film', 'Book', 'BookOpen',
  'Code', 'Terminal', 'Cpu', 'Palette', 'Paintbrush',
  'Sparkles', 'Zap', 'Flame', 'Globe', 'Compass',
  'Shield', 'Rocket', 'Atom',
] as const

const visibilityOptions: { value: LoomVisibility; label: string; icon: typeof Globe; desc: string }[] = [
  { value: 'public', label: 'Public', icon: Globe, desc: 'Anyone can find and join' },
  { value: 'private', label: 'Private', icon: Lock, desc: 'Members only, hidden from search' },
  { value: 'invite_only', label: 'Invite Only', icon: Mail, desc: 'Join by invitation' },
]

const SQUARE_TOLERANCE = 0.03

function isSquare(width: number, height: number): boolean {
  return Math.abs(1 - width / height) <= SQUARE_TOLERANCE
}

function getInitialCrop(imgWidth: number, imgHeight: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, 1, imgWidth, imgHeight),
    imgWidth,
    imgHeight,
  )
}

function cropImageToFile(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
): Promise<File> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  const pixelRatio = window.devicePixelRatio || 1
  const outputSize = Math.min(crop.width * scaleX, 512)

  canvas.width = outputSize * pixelRatio
  canvas.height = outputSize * pixelRatio

  const ctx = canvas.getContext('2d')!
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0, 0, outputSize, outputSize,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas crop failed'))
        resolve(new File([blob], fileName, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  })
}

interface CreateLoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoomCreated: (loomId: string) => void
}

export function CreateLoomDialog({ open, onOpenChange, onLoomCreated }: CreateLoomDialogProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropImgRef = useRef<HTMLImageElement | null>(null)

  const [step, setStep] = useState<'form' | 'icon' | 'crop'>('form')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<LoomVisibility>('private')
  const [iconName, setIconName] = useState('Users')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [iconSearch, setIconSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [rawFileName, setRawFileName] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)

  const filteredIcons = LOOM_ICONS.filter(name =>
    name.toLowerCase().includes(iconSearch.toLowerCase())
  )

  const hasPhoto = Boolean(photoFile && photoPreview)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }
    setError(null)

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      if (isSquare(img.naturalWidth, img.naturalHeight)) {
        setPhotoFile(file)
        setPhotoPreview(url)
        setStep('form')
      } else {
        setRawImageSrc(url)
        setRawFileName(file.name)
        setCrop(undefined)
        setCompletedCrop(null)
        setStep('crop')
      }
    }
    img.src = url
  }, [])

  const handleCropImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    cropImgRef.current = e.currentTarget
    const initialCrop = getInitialCrop(width, height)
    setCrop(initialCrop)
  }, [])

  const handleCropApply = useCallback(async () => {
    if (!cropImgRef.current || !completedCrop) return
    try {
      const cropped = await cropImageToFile(cropImgRef.current, completedCrop, rawFileName)
      if (rawImageSrc) URL.revokeObjectURL(rawImageSrc)
      const preview = URL.createObjectURL(cropped)
      setPhotoFile(cropped)
      setPhotoPreview(preview)
      setRawImageSrc(null)
      setStep('form')
    } catch {
      setError('Failed to crop image. Please try again.')
      setStep('icon')
    }
  }, [completedCrop, rawFileName, rawImageSrc])

  const handleResetCrop = useCallback(() => {
    if (!cropImgRef.current) return
    const { width, height } = cropImgRef.current
    setCrop(getInitialCrop(width, height))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc)
    setPhotoFile(null)
    setPhotoPreview(null)
    setRawImageSrc(null)
    setCompletedCrop(null)
  }

  const handleCreate = async () => {
    if (!user || !name.trim()) return
    setCreating(true)
    setError(null)

    try {
      let iconUrl: string | undefined

      if (photoFile) {
        setUploading(true)
        const tempId = crypto.randomUUID()
        const url = await uploadLoomIcon(String(user.id), tempId, photoFile)
        setUploading(false)
        if (!url) {
          setError('Failed to upload icon. Please try again.')
          setCreating(false)
          return
        }
        iconUrl = url
      }

      const loom = await createLoom({
        name: name.trim(),
        description: description.trim() || undefined,
        iconName: hasPhoto ? undefined : iconName,
        iconUrl,
        visibility,
        createdBy: String(user.id),
      })

      if (loom) {
        onLoomCreated(loom.id)
        onOpenChange(false)
        resetForm()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create Loom')
    } finally {
      setCreating(false)
      setUploading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setVisibility('private')
    setIconName('Users')
    handleRemovePhoto()
    setIconSearch('')
    setStep('form')
    setError(null)
  }

  if (!open) return null

  const SelectedIcon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) { onOpenChange(false); resetForm() } }}
    >
      <div className="bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-[420px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4">
          {(step === 'icon' || step === 'crop') && (
            <button
              onClick={() => step === 'crop' ? setStep('icon') : setStep('form')}
              className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors -ml-1"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="text-base font-semibold text-black dark:text-white flex-1">
            {step === 'form' ? 'Create a Loom' : step === 'crop' ? 'Crop Image' : 'Choose Icon'}
          </h2>
          <button
            onClick={() => { onOpenChange(false); resetForm() }}
            className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── FORM STEP ── */}
        {step === 'form' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              {/* Icon + Name row */}
              <div className="flex items-start gap-4">
                <button
                  onClick={() => setStep('icon')}
                  className="group relative w-[72px] h-[72px] rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all shrink-0 overflow-hidden"
                >
                  {hasPhoto ? (
                    <>
                      <img
                        src={photoPreview!}
                        alt="Loom icon"
                        className="w-full h-full object-cover rounded-[14px]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-[14px] flex items-center justify-center">
                        <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    <>
                      {SelectedIcon && (
                        <SelectedIcon size={28} className="text-black/40 dark:text-white/40 group-hover:text-black/60 dark:group-hover:text-white/60 transition-colors" />
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={10} className="text-black/60 dark:text-white/60" />
                      </div>
                    </>
                  )}
                </button>
                <div className="flex-1 pt-1">
                  <input
                    type="text"
                    placeholder="Loom name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(null) }}
                    autoFocus
                    className="w-full bg-transparent text-[17px] font-semibold outline-none border-none text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25"
                  />
                  <p className="text-[11px] text-black/35 dark:text-white/35 mt-1">
                    Tap icon to customize
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-medium text-black/45 dark:text-white/45 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  placeholder="What's this Loom about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-black/[0.04] dark:bg-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 resize-none transition-colors"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-[11px] font-medium text-black/45 dark:text-white/45 mb-2 uppercase tracking-wider">
                  Visibility
                </label>
                <div className="space-y-1">
                  {visibilityOptions.map((opt) => {
                    const Icon = opt.icon
                    const selected = visibility === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setVisibility(opt.value)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all ${
                          selected
                            ? 'bg-black/[0.06] dark:bg-white/[0.08] shadow-sm'
                            : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          selected
                            ? 'bg-black dark:bg-white'
                            : 'bg-black/[0.06] dark:bg-white/[0.08]'
                        }`}>
                          <Icon size={14} className={selected ? 'text-white dark:text-black' : 'text-black/50 dark:text-white/50'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${selected ? 'text-black dark:text-white' : 'text-black/70 dark:text-white/70'}`}>
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-black/40 dark:text-white/40 leading-tight">{opt.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                          selected
                            ? 'border-black dark:border-white'
                            : 'border-black/15 dark:border-white/15'
                        }`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-black dark:bg-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-black/10 dark:border-white/10">
              <Button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="w-full h-10 rounded-xl font-medium"
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    {uploading ? 'Uploading icon...' : 'Creating...'}
                  </span>
                ) : (
                  'Create Loom'
                )}
              </Button>
            </div>
          </>
        )}

        {/* ── CROP STEP ── */}
        {step === 'crop' && rawImageSrc && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center px-5 pb-4 min-h-0">
              <p className="text-[11px] text-black/40 dark:text-white/40 mb-3 text-center">
                Drag to adjust the crop area
              </p>
              <div className="relative w-full flex items-center justify-center overflow-hidden rounded-xl bg-black/[0.03] dark:bg-white/[0.03] max-h-[340px]">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  className="loom-cropper max-h-[340px]"
                >
                  <img
                    src={rawImageSrc}
                    alt="Crop preview"
                    onLoad={handleCropImageLoad}
                    className="max-h-[340px] w-auto object-contain"
                    style={{ display: 'block' }}
                  />
                </ReactCrop>
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-4 border-t border-black/10 dark:border-white/10">
              <button
                onClick={handleResetCrop}
                className="h-10 px-3 rounded-xl text-sm font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                Reset
              </button>
              <Button
                onClick={handleCropApply}
                disabled={!completedCrop}
                className="flex-1 h-10 rounded-xl font-medium"
              >
                Apply Crop
              </Button>
            </div>
          </>
        )}

        {/* ── ICON PICKER STEP ── */}
        {step === 'icon' && (
          <>
            {/* Upload photo area */}
            <div className="px-5 pt-2 pb-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  dragOver
                    ? 'border-black/30 dark:border-white/30 bg-black/[0.06] dark:bg-white/[0.08]'
                    : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center shrink-0">
                  <Upload size={16} className="text-black/40 dark:text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black/70 dark:text-white/70">Upload a photo</p>
                  <p className="text-[11px] text-black/35 dark:text-white/35">JPG, PNG, or GIF up to 5MB</p>
                </div>
                {hasPhoto && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemovePhoto() }}
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            {/* Divider with label */}
            <div className="flex items-center gap-3 px-5 pb-2">
              <div className="flex-1 h-px bg-black/6 dark:bg-white/6" />
              <span className="text-[10px] font-medium text-black/30 dark:text-white/30 uppercase tracking-widest">or pick an icon</span>
              <div className="flex-1 h-px bg-black/6 dark:bg-white/6" />
            </div>

            {/* Search */}
            <div className="px-5 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-black/[0.04] dark:bg-white/[0.06] rounded-lg text-sm outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 transition-colors"
                />
              </div>
            </div>

            {/* Icon grid */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="grid grid-cols-7 gap-1">
                {filteredIcons.map((name) => {
                  const Icon = LucideIcons[name as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
                  const selected = iconName === name && !hasPhoto
                  return (
                    <button
                      key={name}
                      onClick={() => { setIconName(name); handleRemovePhoto(); setStep('form') }}
                      className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                        selected
                          ? 'bg-black dark:bg-white text-white dark:text-black scale-105'
                          : 'text-black/60 dark:text-white/60 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white'
                      }`}
                      title={name}
                    >
                      {Icon && <Icon size={19} />}
                    </button>
                  )
                })}
              </div>
              {filteredIcons.length === 0 && (
                <p className="text-center text-sm text-black/30 dark:text-white/30 py-8">
                  No icons found
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Cropper style overrides to match the app's dark aesthetic */}
      <style>{`
        .loom-cropper .ReactCrop__crop-selection {
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
        }
        .loom-cropper .ReactCrop__drag-handle::after {
          background-color: white;
          border: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .loom-cropper .ReactCrop__drag-bar {
          background-color: transparent;
        }
      `}</style>
    </div>
  )
}
