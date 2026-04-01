"use client"

import { useState, useRef, useCallback } from 'react'
import { X, Upload, Loader2, Crop } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { ThemeAvatarImage } from './ui/theme-avatar'
import { uploadAvatar, updateUserAvatar } from '@/lib/services/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useAvatarUrl } from '@/hooks/useAvatarUrl'
import { useColorTheme } from '@/hooks/useColorTheme'
import ReactCrop, { Crop as CropType, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface ChangeAvatarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAvatarChanged?: () => void
}

export function ChangeAvatarDialog({ open, onOpenChange, onAvatarChanged }: ChangeAvatarDialogProps) {
  const { user } = useAuth()
  const { colorTheme } = useColorTheme()
  const isBlackWhite = colorTheme.name === "Black & White"
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropType>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const currentAvatarUrl = useAvatarUrl(user?.user_metadata?.avatar_url)
  const displayName = user?.user_metadata?.fullname || user?.user_metadata?.username || user?.email || 'User'
  
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setError(null)
    setSelectedFile(file)

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
      setShowCropper(true)
      setCroppedImageUrl(null)
    }
    reader.readAsDataURL(file)
  }

  const getCroppedImg = useCallback((image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> => {
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    
    canvas.width = crop.width
    canvas.height = crop.height
    const ctx = canvas.getContext('2d')

    if (!ctx) return Promise.resolve(null)

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }, [])

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return

    const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
    if (croppedBlob) {
      const url = URL.createObjectURL(croppedBlob)
      setCroppedImageUrl(url)
      setShowCropper(false)
    }
  }, [completedCrop, getCroppedImg])

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const cropSize = Math.min(width, height)
    const cropX = (width - cropSize) / 2
    const cropY = (height - cropSize) / 2
    
    setCrop({
      unit: 'px',
      x: cropX,
      y: cropY,
      width: cropSize,
      height: cropSize,
    })
  }, [])

  const handleUpload = async () => {
    if (!user) return

    setUploading(true)
    setError(null)

    try {
      let fileToUpload: File

      // If we have a cropped image, convert it to a File
      if (croppedImageUrl && completedCrop && imgRef.current) {
        const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
        if (!croppedBlob) {
          setError('Failed to process image. Please try again.')
          setUploading(false)
          return
        }
        fileToUpload = new File([croppedBlob], selectedFile?.name || 'avatar.jpg', {
          type: 'image/jpeg',
        })
      } else if (selectedFile) {
        fileToUpload = selectedFile
      } else {
        setError('No image selected')
        setUploading(false)
        return
      }

      // Upload new avatar (this will automatically delete all old avatars)
      const avatarUrl = await uploadAvatar(user.id, fileToUpload)
      
      if (!avatarUrl) {
        setError('Failed to upload avatar. Please try again.')
        setUploading(false)
        return
      }

      // Update user profile
      const success = await updateUserAvatar(user.id, avatarUrl)
      
      if (!success) {
        setError('Failed to update profile. Please try again.')
        setUploading(false)
        return
      }

      // Success! Close dialog and notify parent
      onAvatarChanged?.()
      onOpenChange(false)
      
      // Reset state
      resetState()
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const resetState = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setCroppedImageUrl(null)
    setShowCropper(false)
    setError(null)
  }

  const handleRemoveSelection = () => {
    resetState()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBackToCrop = () => {
    setShowCropper(true)
    setCroppedImageUrl(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-white/10">
      <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg shadow-lg w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-xl font-semibold text-black dark:text-white">Change Avatar</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
            disabled={uploading}
          >
            <X size={16} />
          </Button>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
          {/* Image Cropper or Preview */}
          {showCropper && previewUrl ? (
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-black dark:text-white">
                  Adjust your avatar
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag to reposition, resize the corners
                </p>
              </div>
              <div className="max-h-96 overflow-auto border border-black/10 dark:border-white/10 rounded-lg">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
              <Button onClick={handleCropComplete} className="w-full">
                <Crop className="mr-2 h-4 w-4" />
                Apply Crop
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-32 w-32">
                <AvatarImage src={croppedImageUrl || currentAvatarUrl} alt={displayName} />
                <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                {croppedImageUrl ? 'Cropped avatar preview' : 'Current avatar'}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={`w-full p-3 border rounded-md ${
              isBlackWhite 
                ? "bg-foreground/10 border-black/10 dark:border-white/10" 
                : "bg-red-100 dark:bg-red-900/30 border-red-300/80 dark:border-red-700/80"
            }`}>
              <p className={`text-sm ${
                isBlackWhite 
                  ? "text-foreground" 
                  : "text-red-600 dark:text-red-400"
              }`}>{error}</p>
            </div>
          )}

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            {!showCropper && selectedFile ? (
              <>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !croppedImageUrl}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Avatar
                    </>
                  )}
                </Button>
                {croppedImageUrl && (
                  <Button
                    variant="outline"
                    onClick={handleBackToCrop}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Crop className="mr-2 h-4 w-4" />
                    Re-crop Image
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleRemoveSelection}
                  disabled={uploading}
                  className="w-full"
                >
                  Cancel Selection
                </Button>
              </>
            ) : !selectedFile ? (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose Image
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Supported formats: JPEG, PNG, WebP (max 5MB)
          </p>
        </div>
      </div>
    </div>
  )
}

