"use client"

import { useState } from 'react'
import { resetPassword } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await resetPassword(emailOrUsername)

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSent(true)
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
          {sent ? (
            <div className="space-y-6">
              <p className="text-center text-sm text-[#181818] dark:text-white">
                If an account exists for <span className="font-medium">{emailOrUsername}</span>, a password reset link has been sent to the associated email address. Check your inbox to continue.
              </p>
              <p className="text-center text-sm text-[#181818] dark:text-white">
                <Link href="/auth/login" className="text-[#181818] dark:text-white underline hover:no-underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-center text-sm text-[#181818] dark:text-white">
                Enter your email or username and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="p-3 text-sm text-[#181818] dark:text-white border border-black/10 dark:border-white/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="control block-cube block-input">
                  <input
                    id="emailOrUsername"
                    name="emailOrUsername"
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="Email or username"
                    autoComplete="off"
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
                {loading ? 'Sending link...' : 'Send reset link'}
              </Button>

              <p className="text-center text-sm text-[#181818] dark:text-white">
                Remembered it?{' '}
                <Link href="/auth/login" className="text-[#181818] dark:text-white underline hover:no-underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
