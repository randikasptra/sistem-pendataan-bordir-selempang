import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { loadDesignVersion } from '@/app/actions/design'
import EditorWrapper from './EditorWrapper'

interface PageProps {
  params: Promise<{ id: string; itemId: string }>
}

export default async function EditDesignPage({ params }: PageProps) {
  const { id: poId, itemId } = await params
  await requireRole(['owner', 'admin'])

  const supabase = await createClient()

  // Fetch PO and item
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*, po_items(*)')
    .eq('id', poId)
    .single()

  if (poError || !po) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = (po.po_items as any[]).find((i: any) => i.id === itemId)
  if (!item) {
    notFound()
  }

  // Load existing design version
  const designVersion = await loadDesignVersion(itemId)

  // Get reference image if exists
  const { data: referenceAttachments } = await supabase
    .from('attachments')
    .select('*')
    .eq('item_id', itemId)
    .eq('type', 'reference')
    .order('created_at', { ascending: false })
    .limit(1)

  const referenceImageUrl = referenceAttachments?.[0]?.storage_path
    ? `/storage/v1/object/public/po-attachments/${referenceAttachments[0].storage_path}`
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/po/${poId}`} className="text-sm text-gray-500 hover:text-gray-900">
            ← Kembali ke PO
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Editor Desain</h1>
          <p className="text-sm text-muted-foreground">Item: {item.title}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <EditorWrapper
          poId={poId}
          itemId={itemId}
          initialCanvasJson={designVersion?.canvas_json ? JSON.stringify(designVersion.canvas_json) : undefined}
          referenceImageUrl={referenceImageUrl}
        />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold mb-2">Catatan</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Gunakan kuas untuk menggambar bebas di atas gambar referensi</li>
          <li>• Pilih warna dan ukuran kuas sesuai kebutuhan</li>
          <li>• Gunakan penghapus untuk menghapus bagian tertentu</li>
          <li>• Klik &quot;Simpan Desain&quot; untuk menyimpan progress Anda</li>
          <li>• Canvas disimpan sebagai JSON dan dapat diedit kembali nanti</li>
        </ul>
      </div>
    </div>
  )
}
