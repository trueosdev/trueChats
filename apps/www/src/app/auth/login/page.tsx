"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function LoginForm() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(emailOrUsername, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // router.push will handle navigation, no need for refresh
      router.push('/')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Header with Logo */}
        <div className="text-center">
          <img 
            src="/trueChatsLogo.svg" 
            alt="trueChats Logo" 
            className="h-16 mx-auto mb-4"
          />
        </div>

        <div className="rounded-lg p-8 space-y-8">

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Username"
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

            <div className="control block-cube block-input">
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
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
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-[#181818] dark:text-white">
            <Link href="/auth/forgot-password" className="text-[#181818] dark:text-white underline hover:no-underline">
              Forgot your password?
            </Link>
          </p>

          <p className="text-center text-sm text-[#181818] dark:text-white">
            New to trueChats?{' '}
            <Link href="/auth/signup" className="text-[#181818] dark:text-white underline hover:no-underline">
              Sign up
            </Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="text-center">
            <img 
              src="/trueChatsLogo.svg" 
              alt="trueChats Logo" 
              className="h-16 mx-auto mb-4"
            />
          </div>
          <div className="p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#181818] dark:text-white">Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

