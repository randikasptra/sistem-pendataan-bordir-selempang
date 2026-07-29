import { createClient } from '@supabase/supabase-js'

const required = (name: string) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
const supabaseAnonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY')

/**
 * Image upload and compression utilities for PO attachments
 */

export interface ImageUploadOptions {
  bucket?: string
  maxSizeBytes?: number
  quality?: number
  resize?: {
    width: number
    height: number
  }
}

export interface UploadResult {
  path: string
  url: string
  mimeType: string
  sizeBytes: number
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File, maxSizeBytes = 5 * 1024 * 1024): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Format gambar harus JPEG, PNG, atau WebP',
    }
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Ukuran gambar maksimal ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
    }
  }

  return { valid: true }
}

/**
 * Generate unique storage path for attachment
 */
export function generateStoragePath(poId: string, itemId?: string, type: string = 'reference'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)

  if (itemId) {
    return `po/${poId}/items/${itemId}/${type}-${timestamp}-${random}`
  }

  return `po/${poId}/${type}-${timestamp}-${random}`
}

/**
 * Get MIME type for output format
 */
export function getMimeType(format: 'jpeg' | 'png' | 'webp'): string {
  const types = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  return types[format] || 'image/jpeg'
}

/**
 * Resize image data (client-side using canvas)
 * Note: This requires browser environment
 */
export async function resizeImageInBrowser(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Could not compress image'))
          },
          'image/webp',
          quality
        )
      }

      img.onerror = () => reject(new Error('Could not load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(
  file: File,
  thumbnailWidth: number = 200,
  thumbnailHeight: number = 200
): Promise<Blob> {
  return resizeImageInBrowser(file, thumbnailWidth, thumbnailHeight, 0.8)
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadToStorage(
  file: Blob,
  storagePath: string,
  bucket: string = 'po-attachments'
): Promise<UploadResult> {
  const client = createClient(supabaseUrl, supabaseAnonKey)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, error } = await client.storage
    .from(bucket)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const mimeType = file.type || 'application/octet-stream'

  return {
    path: storagePath,
    url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`,
    mimeType,
    sizeBytes: file.size,
  }
}

/**
 * Get signed URL for private file access
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600,
  bucket: string = 'po-attachments'
): Promise<string> {
  const client = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn)

  if (error) {
    throw new Error(`Could not generate signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Delete file from storage
 */
export async function deleteFromStorage(
  storagePath: string,
  bucket: string = 'po-attachments'
): Promise<void> {
  const client = createClient(supabaseUrl, supabaseAnonKey)

  const { error } = await client.storage
    .from(bucket)
    .remove([storagePath])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Check if file exists in storage
 */
export async function fileExists(
  storagePath: string,
  bucket: string = 'po-attachments'
): Promise<boolean> {
  const client = createClient(supabaseUrl, supabaseAnonKey)

  const { data } = await client.storage
    .from(bucket)
    .list('', {
      limit: 1,
      search: storagePath,
    })

  return data ? data.some((file) => file.name === storagePath) : false
}
