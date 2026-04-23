"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    // Get initial session. If the persisted refresh token is stale (e.g. the
    // Supabase project's JWT secret rotated or the user was deleted server
    // side), getSession() resolves with an AuthApiError like "Invalid Refresh
    // Token: Refresh Token Not Found". Catch it, wipe the local session, and
    // fall back to signed-out state so the user lands on /auth/login cleanly
    // instead of seeing a red console error every cold load.
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return
        if (error) {
          void supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          setSession(null)
          setUser(null)
          setLoading(false)
          return
        }
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        void supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        setSession(null)
        setUser(null)
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Only refresh on SIGNED_IN event to avoid unnecessary refreshes
        if (session && _event === 'SIGNED_IN') {
          router.refresh()
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

