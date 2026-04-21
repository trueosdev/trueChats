import { supabase } from './client'

export async function signUp(email: string, password: string, username: string, fullname?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      data: {
        username,
        fullname: fullname || '',
        avatar_url: '',
        bio: '',
      },
    },
  })
  return { data, error }
}

/**
 * Get email by username for login purposes
 * This function uses a database function to find the email associated with a username
 */
async function getEmailByUsername(username: string): Promise<string | null> {
  try {
    // Add timeout to prevent hanging on slow database
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 5000) // 5 second timeout
    })

    const rpcPromise = supabase.rpc('get_email_by_username', {
      p_username: username,
    }).then(({ data, error }) => {
      if (error || !data) {
        return null
      }
      return data
    })

    const result = await Promise.race([rpcPromise, timeoutPromise])
    return result
  } catch (error) {
    console.error('Error looking up email by username:', error)
    return null
  }
}

/**
 * Sign in with either email or username
 * @param emailOrUsername - User's email address or username
 * @param password - User's password
 */
export async function signIn(emailOrUsername: string, password: string) {
  // Check if input looks like an email (contains @)
  const isEmail = emailOrUsername.includes('@')
  
  let email = emailOrUsername

  // If it's not an email, try to look up the email by username
  if (!isEmail) {
    const foundEmail = await getEmailByUsername(emailOrUsername)
    if (!foundEmail) {
      // Return an error if username not found
      return {
        data: null,
        error: {
          message: 'Invalid login credentials',
          name: 'AuthApiError',
          status: 400,
        } as any,
      }
    }
    email = foundEmail
  }

  // Sign in with the email
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Send a password reset email. Supports looking up an email by username as
 * well, matching the behavior of `signIn`.
 */
export async function resetPassword(emailOrUsername: string) {
  const isEmail = emailOrUsername.includes('@')
  let email = emailOrUsername

  if (!isEmail) {
    const foundEmail = await getEmailByUsername(emailOrUsername)
    if (!foundEmail) {
      return {
        data: null,
        error: {
          message: 'No account found for that username',
          name: 'AuthApiError',
          status: 400,
        } as any,
      }
    }
    email = foundEmail
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback?next=/auth/reset-password`
      : undefined

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  return { data, error }
}

/**
 * Update the signed-in user's password. Used after a password recovery
 * redirect has exchanged the recovery code for a session.
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  return { data, error }
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

