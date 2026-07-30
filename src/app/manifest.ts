import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest { return { name:'Sistem Distribusi PO Bordir', short_name:'PO Bordir', start_url:'/', display:'standalone', background_color:'#f9fafb', theme_color:'#1d4ed8', icons:[{src:'/icon',sizes:'512x512',type:'image/png'}] } }
