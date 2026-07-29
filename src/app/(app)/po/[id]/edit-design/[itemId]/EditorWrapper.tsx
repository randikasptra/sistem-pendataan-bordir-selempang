'use client'

import dynamic from 'next/dynamic'
import { saveDesignVersion } from '@/app/actions/design'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Dynamically import FabricEditor to avoid SSR issues
const FabricEditor = dynamic(() => import('@/app/(app)/components/FabricEditor'), {
  ssr: false,
  loading: () => <div className="p-8">Memuat editor...</div>,
})

interface EditorWrapperProps {
  poId: string
  itemId: string
  initialCanvasJson?: string
  referenceImageUrl?: string
}

export default function EditorWrapper({
  poId,
  itemId,
  initialCanvasJson,
  referenceImageUrl,
}: EditorWrapperProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSave = async (canvasJson: string, preview: Blob) => {
    setSaving(true)
    try {
      await saveDesignVersion(itemId, canvasJson, '')
      alert('Desain berhasil disimpan!')
      router.refresh()
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Gagal menyimpan desain. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {saving && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
          Menyimpan desain...
        </div>
      )}
      <FabricEditor
        poId={poId}
        itemId={itemId}
        initialCanvasJson={initialCanvasJson}
        referenceImageUrl={referenceImageUrl}
        onSave={handleSave}
      />
    </div>
  )
}
