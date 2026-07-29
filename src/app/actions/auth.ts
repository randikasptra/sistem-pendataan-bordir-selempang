'use server'

import { publicEnv } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(email: string, password: string, redirectTo: string = '/') {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      error: error.message || 'Gagal login. Silakan cek email dan password Anda.',
    }
  }

  redirect(redirectTo)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${publicEnv.APP_URL}/auth/callback?next=/update-password`,
  })

  if (error) {
    return {
      error: error.message || 'Gagal mengirim email reset password.',
    }
  }

  return {
    success: true,
  }
}
