'use client'

import { useEffect, useRef, useState } from 'react'

interface FabricEditorProps {
  poId: string
  itemId: string
  initialCanvasJson?: string
  referenceImageUrl?: string
  onSave?: (canvasJson: string, preview: Blob) => void
}

export default function FabricEditor({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  poId,
  itemId,
  initialCanvasJson,
  referenceImageUrl,
  onSave,
}: FabricEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fabricCanvas, setFabricCanvas] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTool, setSelectedTool] = useState<'brush' | 'text' | 'line' | 'rect' | 'circle' | 'eraser'>('brush')
  const [brushColor, setBrushColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(3)

  // Load Fabric.js dynamically
  useEffect(() => {
    const loadFabric = async () => {
      const fabricLib = await import('fabric')
      const fabric = fabricLib.fabric || fabricLib.default || fabricLib

      if (!canvasRef.current) return

      // Initialize canvas
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
      })

      // Load initial canvas if provided
      if (initialCanvasJson) {
        try {
          canvas.loadFromJSON(JSON.parse(initialCanvasJson), () => {
            canvas.renderAll()
          })
        } catch (e) {
          console.error('Failed to load canvas JSON:', e)
        }
      }

      // Load reference image if provided
      if (referenceImageUrl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fabric.Image.fromURL(referenceImageUrl, (img: any) => {
          if (img.width && img.height) {
            const scale = Math.min(800 / img.width, 600 / img.height)
            img.scale(scale)
            canvas.insertAt(img, 0, true)
            img.setCoords()
            canvas.renderAll()
          }
        })
      }

      // Setup brush
      canvas.isDrawingMode = true
      canvas.freeDrawingBrush.color = brushColor
      canvas.freeDrawingBrush.width = brushSize

      setFabricCanvas(canvas)
      setIsLoading(false)
    }

    loadFabric().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCanvasJson, referenceImageUrl])

  // Update brush settings
  useEffect(() => {
    if (fabricCanvas) {
      /* eslint-disable react-hooks/immutability */
      if (selectedTool === 'brush') {
        fabricCanvas.isDrawingMode = true
        fabricCanvas.freeDrawingBrush.color = brushColor
        fabricCanvas.freeDrawingBrush.width = brushSize
      } else if (selectedTool === 'eraser') {
        fabricCanvas.isDrawingMode = true
        fabricCanvas.freeDrawingBrush.color = '#ffffff'
        fabricCanvas.freeDrawingBrush.width = brushSize
      } else {
        fabricCanvas.isDrawingMode = false
      }
      /* eslint-enable react-hooks/immutability */
    }
  }, [selectedTool, brushColor, brushSize, fabricCanvas])

  const handleSave = async () => {
    if (!fabricCanvas) return

    try {
      // Get canvas JSON
      const canvasJson = JSON.stringify(fabricCanvas.toJSON())

      // Export as PNG
      const dataUrl = fabricCanvas.toDataURL({ format: 'png' })
      const blob = await fetch(dataUrl).then((res) => res.blob())

      onSave?.(canvasJson, blob)
    } catch (error) {
      console.error('Failed to save canvas:', error)
    }
  }

  const handleUndo = () => {
    if (fabricCanvas && fabricCanvas.undo) {
      fabricCanvas.undo()
    }
  }

  const handleRedo = () => {
    if (fabricCanvas && fabricCanvas.redo) {
      fabricCanvas.redo()
    }
  }

  const handleClear = () => {
    if (fabricCanvas && confirm('Hapus semua konten canvas?')) {
      fabricCanvas.clear()
    }
  }

  const handleDownload = () => {
    if (!fabricCanvas) return

    const dataUrl = fabricCanvas.toDataURL({ format: 'png' })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `design-${itemId}-${Date.now()}.png`
    link.click()
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Memuat editor...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <select
          value={selectedTool}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e) => setSelectedTool(e.target.value as any)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="brush">Kuas</option>
          <option value="eraser">Penghapus</option>
          <option value="text">Teks</option>
          <option value="line">Garis</option>
          <option value="rect">Kotak</option>
          <option value="circle">Lingkaran</option>
        </select>

        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          className="h-10 w-12 border rounded cursor-pointer"
          title="Pilih warna"
        />

        <div className="flex items-center gap-2">
          <label htmlFor="brush-size" className="text-sm">
            Ukuran:
          </label>
          <input
            id="brush-size"
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-500 w-8">{brushSize}px</span>
        </div>

        <button
          onClick={handleUndo}
          className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
          title="Ctrl+Z"
        >
          ↶ Urungkan
        </button>

        <button
          onClick={handleRedo}
          className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
          title="Ctrl+Y"
        >
          ↷ Lanjutkan
        </button>

        <button
          onClick={handleClear}
          className="px-3 py-2 border rounded text-sm hover:bg-red-50 text-red-600"
        >
          Hapus
        </button>

        <button
          onClick={handleDownload}
          className="px-3 py-2 border rounded text-sm hover:bg-blue-50 text-blue-600"
        >
          Unduh PNG
        </button>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          Simpan Desain
        </button>
      </div>

      <div className="border rounded overflow-hidden bg-white">
        <canvas ref={canvasRef} className="block mx-auto" />
      </div>
    </div>
  )
}
