"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { updatePassword } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      setHasSession(!!session)
      setCheckingSession(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await updatePassword(password)

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 1500)
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="text-center">
          <img
            src="/trueChatsLogo.svg"
            alt="trueChats Logo"
            className="h-16 mx-auto mb-4"
          />
        </div>

        <div className="rounded-lg p-8 space-y-8">
          {checkingSession ? (
            <p className="text-center text-sm text-[#181818] dark:text-white">
              Loading...
            </p>
          ) : !hasSession ? (
            <div className="space-y-6">
              <p className="text-center text-sm text-[#181818] dark:text-white">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <p className="text-center text-sm text-[#181818] dark:text-white">
                <Link href="/auth/forgot-password" className="text-[#181818] dark:text-white underline hover:no-underline">
                  Request a new link
                </Link>
              </p>
            </div>
          ) : success ? (
            <p className="text-center text-sm text-[#181818] dark:text-white">
              Password updated. Redirecting...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-center text-sm text-[#181818] dark:text-white">
                Choose a new password for your account.
              </p>

              {error && (
                <div className="p-3 text-sm text-[#181818] dark:text-white border border-black/10 dark:border-white/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="control block-cube block-input">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    autoComplete="new-password"
                  />
                  <div className="bg-top">
                    <div className="bg-inner"></div>
                  </div>
                  <div className="bg-right">
                    <div className="bg-inner"></div>
                  </div>
                  <div className="bg">
                    <div className="bg-inner"></div>
                  </div>
                </div>

                <div className="control block-cube block-input">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <div className="bg-top">
                    <div className="bg-inner"></div>
                  </div>
                  <div className="bg-right">
                    <div className="bg-inner"></div>
                  </div>
                  <div className="bg">
                    <div className="bg-inner"></div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
