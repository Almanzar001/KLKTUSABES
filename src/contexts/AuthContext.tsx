import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, authHelpers } from '../supabase'
import { UserProfile } from '../types'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  isCreator: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Verificar si el usuario es creador
  const isCreator = userProfile?.role === 'creador'

  // Función para cargar el perfil del usuario
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await authHelpers.getUserProfile(userId)
      if (error) {
        console.error('Error cargando perfil:', error)
        setError('Error al cargar el perfil del usuario')
        return
      }
      setUserProfile(data)
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Error inesperado al cargar el perfil')
    }
  }

  // Inicializar estado de autenticación con timeout
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        
        // Crear timeout para detectar si se cuelga
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Auth timeout')), 3000) // 3 segundos timeout
        })
        
        const authPromise = supabase.auth.getSession()
        
        // Usar Promise.race para timeout
        const result = await Promise.race([authPromise, timeoutPromise])
        
        
        const { data: { session: currentSession }, error: sessionError } = result
        
        if (sessionError) {
          console.error('Error obteniendo sesión:', sessionError)
          setError('Error al obtener la sesión')
          setLoading(false)
          return
        }

        if (currentSession?.user) {
          setUser(currentSession.user)
          setSession(currentSession)
          await loadUserProfile(currentSession.user.id)
        }
      } catch (err) {
        console.error('Error inicializando auth (usando fallback):', err)
        
        // Si falla por timeout, intentar obtener desde localStorage
        try {
            const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL
            const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
          const storedSession = localStorage.getItem(storageKey)
          
          if (storedSession) {
            const session = JSON.parse(storedSession)
            if (session?.user) {
                setUser(session.user)
              setSession(session)
              await loadUserProfile(session.user.id)
            }
          }
        } catch (fallbackErr) {
          console.error('Error en fallback:', fallbackErr)
          setError('Error al inicializar la autenticación')
        }
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        
        setSession(session)
        setUser(session?.user ?? null)
        setError(null)

        if (session?.user) {
          // Usuario logueado - cargar perfil
          await loadUserProfile(session.user.id)
        } else {
          // Usuario deslogueado - limpiar estado
          setUserProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Función para iniciar sesión con Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await authHelpers.signInWithGoogle()
      
      if (error) {
        console.error('Error en login con Google:', error)
        setError('Error al iniciar sesión con Google: ' + error.message)
      }
    } catch (err) {
      console.error('Error inesperado en login:', err)
      setError('Error inesperado al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  // Función para registrarse con email y contraseña
  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await authHelpers.signUpWithEmail(email, password, fullName)
      
      if (error) {
        console.error('Error en registro:', error)
        setError('Error al registrarse: ' + error.message)
      }
    } catch (err) {
      console.error('Error inesperado en registro:', err)
      setError('Error inesperado al registrarse')
    } finally {
      setLoading(false)
    }
  }

  // Función para iniciar sesión con email y contraseña
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await authHelpers.signInWithEmail(email, password)
      
      if (error) {
        console.error('Error en login con email:', error)
        setError('Error al iniciar sesión: ' + error.message)
      }
    } catch (err) {
      console.error('Error inesperado en login:', err)
      setError('Error inesperado al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  // Función para restablecer contraseña
  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await authHelpers.resetPassword(email)
      
      if (error) {
        console.error('Error al restablecer contraseña:', error)
        setError('Error al enviar correo de restablecimiento: ' + error.message)
      } else {
        setError('Se ha enviado un correo para restablecer tu contraseña')
      }
    } catch (err) {
      console.error('Error inesperado al restablecer contraseña:', err)
      setError('Error inesperado al restablecer contraseña')
    } finally {
      setLoading(false)
    }
  }

  // Función para cerrar sesión
  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await authHelpers.signOut()
      
      if (error) {
        console.error('Error en logout:', error)
        setError('Error al cerrar sesión: ' + error.message)
      } else {
        // Limpiar estado local
        setUser(null)
        setUserProfile(null)
        setSession(null)
      }
    } catch (err) {
      console.error('Error inesperado en logout:', err)
      setError('Error inesperado al cerrar sesión')
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    isCreator
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}