'use client'

import { resetPassword } from '@/app/actions/auth'
import Link from 'next/link'
import { FormEvent, useState, useTransition } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await resetPassword(email)
      if (result.error) {
        setError(result.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Masukkan email Anda untuk menerima instruksi reset password
          </p>
        </div>

        {submitted ? (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Email reset password telah dikirim ke {email}. Silakan cek inbox atau folder spam Anda.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
              Kembali ke login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 sm:text-sm"
                placeholder="Email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              {isPending ? 'Mengirim...' : 'Kirim Email Reset'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                Kembali ke login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
