"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/supabase/auth'
import { checkUsernameAvailability } from '@/lib/services/users'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullname, setFullname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUsername = async () => {
      if (username.length < 3) {
        setUsernameAvailable(null)
        return
      }

      setCheckingUsername(true)
      const available = await checkUsernameAvailability(username)
      setUsernameAvailable(available)
      setCheckingUsername(false)
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!usernameAvailable) {
      setError('Username is not available')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, username, fullname)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg shadow-lg p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-black dark:text-white">Create an account</h1>
            <p className="mt-2 text-black dark:text-white">
              Sign up to start chatting
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-black dark:text-white bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-black dark:text-white">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2 text-black dark:text-white">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  required
                  minLength={3}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                  placeholder="johndoe"
                />
                {username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <div className="animate-spin rounded-full h-4 w-4 border border-black/20 dark:border-white/20 border-t-black/50 dark:border-t-white/50"></div>
                    ) : usernameAvailable === true ? (
                      <span className="text-black dark:text-white text-sm">✓</span>
                    ) : usernameAvailable === false ? (
                      <span className="text-black dark:text-white text-sm">✗</span>
                    ) : null}
                  </div>
                )}
              </div>
              {username.length >= 3 && usernameAvailable === false && (
                <p className="mt-1 text-sm text-black dark:text-white">
                  Username is already taken
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fullname" className="block text-sm font-medium mb-2 text-black dark:text-white">
                Full Name (optional)
              </label>
              <input
                id="fullname"
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-black dark:text-white">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-black dark:text-white">
                Must be at least 6 characters
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || usernameAvailable === false}>
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>

          <p className="text-center text-sm text-black dark:text-white">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-black dark:text-white underline hover:no-underline">
              Sign in
            </Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  )
}

