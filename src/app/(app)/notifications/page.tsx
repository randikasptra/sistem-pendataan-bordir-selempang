import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { markAllNotificationsRead, markNotificationRead } from '@/app/actions/notifications'
import Link from 'next/link'

export default async function NotificationsPage() {
  const { userId, profile } = await requireAuth(); const supabase = await createClient()
  const { data: notificationData } = await supabase.from('notifications').select('id,title,body,entity_type,entity_id,read_at,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
  const data = notificationData ?? []
  const base = profile.role === 'vendor' ? '/vendor/po/' : '/po/'
  return <main className="p-4 sm:p-8"><div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-bold">Notifikasi</h1><form action={markAllNotificationsRead}><button className="rounded border px-3 py-2 text-sm">Tandai semua dibaca</button></form></div>{data.length ? <ul className="mt-6 space-y-3">{data.map(n => <li key={n.id} className={`rounded-xl border p-4 ${n.read_at ? '' : 'bg-blue-50'}`}><Link href={n.entity_type === 'purchase_order' && n.entity_id ? `${base}${n.entity_id}` : '/notifications'}><b>{n.title}</b><p className="text-sm">{n.body}</p></Link>{!n.read_at && <form action={markNotificationRead.bind(null, n.id)}><button className="mt-2 text-sm underline">Tandai dibaca</button></form>}</li>)}</ul> : <p className="mt-6 text-gray-500">Belum ada notifikasi.</p>}</main>
}
