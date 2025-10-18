import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables de entorno de Supabase no encontradas. Por favor configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Funciones auxiliares para trabajar con la base de datos


// Funciones de autenticación
export const authHelpers = {
  // Iniciar sesión con Google
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`
      }
    })
    return { data, error }
  },

  // Registrarse con email y contraseña
  signUpWithEmail: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    return { data, error }
  },

  // Iniciar sesión con email y contraseña
  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Restablecer contraseña
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { data, error }
  },

  // Cerrar sesión
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Obtener usuario actual
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Obtener perfil del usuario (usando REST API)
  getUserProfile: async (userId: string) => {
    try {
      // Obtener token del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (e) {}

      const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}&select=*`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: { message: `Error al obtener perfil: ${errorText}` } }
      }

      const profiles = await response.json()
      const profile = profiles[0] || null

      return { data: profile, error: null }

    } catch (error) {
      console.error('Error in getUserProfile:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido al cargar perfil'
        } 
      }
    }
  }
}

// Funciones para juegos
export const gameHelpers = {
  // Obtener todos los juegos (usando REST API)
  getAllGames: async () => {
    try {
      // Obtener token del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (e) {}

      // Obtener todos los juegos
      const gamesResponse = await fetch(`${supabaseUrl}/rest/v1/games?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
        }
      })

      if (!gamesResponse.ok) {
        const errorText = await gamesResponse.text()
        return { data: null, error: { message: `Error al obtener juegos: ${errorText}` } }
      }

      const games = await gamesResponse.json()

      // Para cada juego, obtener sus preguntas
      const gamesWithQuestions = await Promise.all(
        games.map(async (game: any) => {
          try {
            const questionsResponse = await fetch(`${supabaseUrl}/rest/v1/questions?game_id=eq.${game.id}&select=*&order=order_number.asc`, {
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
              }
            })

            if (questionsResponse.ok) {
              const questions = await questionsResponse.json()
              return { ...game, questions }
            } else {
              return { ...game, questions: [] }
            }
          } catch (e) {
            return { ...game, questions: [] }
          }
        })
      )

      return { data: gamesWithQuestions, error: null }

    } catch (error) {
      console.error('Error in getAllGames:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido al cargar juegos'
        } 
      }
    }
  },

  // Obtener un juego específico con sus preguntas (usando REST API)
  getGameWithQuestions: async (gameId: string) => {
    try {
      // Obtener token del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (e) {}

      // Obtener el juego
      const gameResponse = await fetch(`${supabaseUrl}/rest/v1/games?id=eq.${gameId}&select=*`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
        }
      })

      if (!gameResponse.ok) {
        return { data: null, error: { message: 'Error al obtener el juego' } }
      }

      const games = await gameResponse.json()
      const game = games[0]

      if (!game) {
        return { data: null, error: { message: 'Juego no encontrado' } }
      }

      // Obtener las preguntas del juego
      const questionsResponse = await fetch(`${supabaseUrl}/rest/v1/questions?game_id=eq.${gameId}&select=*&order=order_number.asc`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
        }
      })

      if (!questionsResponse.ok) {
        return { data: null, error: { message: 'Error al obtener las preguntas' } }
      }

      const questions = await questionsResponse.json()

      // Combinar juego con preguntas
      const gameWithQuestions = {
        ...game,
        questions: questions
      }


      return { data: gameWithQuestions, error: null }

    } catch (error) {
      console.error('Error in getGameWithQuestions:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido'
        } 
      }
    }
  },

  // Crear un nuevo juego
  createGame: async (title: string, description: string, userId: string) => {
    const { data, error } = await supabase
      .from('games')
      .insert([
        {
          title,
          description,
          created_by_user: userId
        }
      ])
      .select()
      .single()
    return { data, error }
  },

  // Actualizar un juego existente
  updateGame: async (gameId: string, gameData: { title?: string; description?: string }) => {
    try {
      // Obtener token directamente del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (storageError) {
        // Auth token not available, using API key only
      }
      
      const apiUrl = `${supabaseUrl}/rest/v1/games?id=eq.${gameId}`
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(gameData)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return { 
          data: null, 
          error: { 
            message: `HTTP ${response.status}: ${errorText}`,
            status: response.status
          } 
        }
      }
      
      const data = await response.json()
      const updatedGame = Array.isArray(data) ? data[0] : data
      
      
      return { data: updatedGame, error: null }
      
    } catch (error) {
      console.error('Error in updateGame:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido al actualizar juego',
          originalError: error
        } 
      }
    }
  },

  // Eliminar un juego
  deleteGame: async (gameId: string) => {
    try {
      // Obtener token directamente del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (storageError) {
        // Auth token not available, using API key only
      }
      
      const apiUrl = `${supabaseUrl}/rest/v1/games?id=eq.${gameId}`
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return { 
          data: null, 
          error: { 
            message: `HTTP ${response.status}: ${errorText}`,
            status: response.status
          } 
        }
      }
      
      
      return { data: { success: true }, error: null }
      
    } catch (error) {
      console.error('Error in deleteGame:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido al eliminar juego',
          originalError: error
        } 
      }
    }
  },

  // Versión usando REST API directa (bypass del cliente JS)
  addQuestionDirect: async (gameId: string, questionData: any) => {
    try {
      const insertData = {
        game_id: gameId,
        ...questionData
      }
      
      // Obtener token directamente del localStorage (bypass del cliente)
      let authToken = null
      try {
        // Supabase guarda la sesión en localStorage con esta key
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (storageError) {
        // localStorage failed, using API key only
      }
      
      const apiUrl = `${supabaseUrl}/rest/v1/questions`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return { 
          data: null, 
          error: { 
            message: `HTTP ${response.status}: ${errorText}`,
            status: response.status
          } 
        }
      }
      
      const data = await response.json()
      
      // Supabase devuelve un array, tomamos el primer elemento
      const insertedQuestion = Array.isArray(data) ? data[0] : data
      
      return { data: insertedQuestion, error: null }
      
    } catch (error) {
      console.error('Error in addQuestionDirect:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido en REST API',
          originalError: error
        } 
      }
    }
  },

  // Agregar pregunta a un juego (ahora usando REST API como la versión directa)
  addQuestion: async (gameId: string, questionData: any) => {
    try {
      const insertData = {
        game_id: gameId,
        ...questionData
      }
      
      // Obtener token directamente del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (storageError) {
        // Auth token not available, using API key only
      }
      
      const apiUrl = `${supabaseUrl}/rest/v1/questions`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return { 
          data: null, 
          error: { 
            message: `HTTP ${response.status}: ${errorText}`,
            status: response.status
          } 
        }
      }
      
      const data = await response.json()
      const insertedQuestion = Array.isArray(data) ? data[0] : data
      
      
      return { data: insertedQuestion, error: null }
      
    } catch (error) {
      console.error('Error in addQuestion:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido en REST API',
          originalError: error
        } 
      }
    }
  },

  // Actualizar pregunta existente
  updateQuestion: async (questionId: string, questionData: any) => {
    try {
      // Obtener token directamente del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (storageError) {
        // Auth token not available, using API key only
      }
      
      const apiUrl = `${supabaseUrl}/rest/v1/questions?id=eq.${questionId}`
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(questionData)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return { 
          data: null, 
          error: { 
            message: `HTTP ${response.status}: ${errorText}`,
            status: response.status
          } 
        }
      }
      
      const data = await response.json()
      const updatedQuestion = Array.isArray(data) ? data[0] : data
      
      
      return { data: updatedQuestion, error: null }
      
    } catch (error) {
      console.error('Error in updateQuestion:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido al actualizar pregunta',
          originalError: error
        } 
      }
    }
  },

  // Eliminar pregunta
  deleteQuestion: async (questionId: string) => {
    try {
      // Obtener token directamente del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (storageError) {
        // Auth token not available, using API key only
      }
      
      const apiUrl = `${supabaseUrl}/rest/v1/questions?id=eq.${questionId}`
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return { 
          data: null, 
          error: { 
            message: `HTTP ${response.status}: ${errorText}`,
            status: response.status
          } 
        }
      }
      
      
      return { data: { success: true }, error: null }
      
    } catch (error) {
      console.error('Error in deleteQuestion:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido al eliminar pregunta',
          originalError: error
        } 
      }
    }
  }
}

// Funciones para estadísticas
export const statsHelpers = {
  // Obtener estadísticas generales de la aplicación
  getAppStatistics: async () => {
    try {
      
      // Obtener token del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (e) {}

      // Obtener estadísticas en paralelo
      const [gamesResponse, creatorsResponse, sessionsResponse] = await Promise.all([
        // Total de juegos públicos
        fetch(`${supabaseUrl}/rest/v1/games?select=id&is_public=eq.true`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          }
        }),
        
        // Usuarios creadores (con role 'creador' en user_profiles)
        fetch(`${supabaseUrl}/rest/v1/user_profiles?select=id&role=eq.creador`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          }
        }),
        
        // Total de sesiones QR activas
        fetch(`${supabaseUrl}/rest/v1/qr_game_sessions?select=id&is_active=eq.true`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          }
        })
      ])

      const [gamesData, creatorsData, sessionsData] = await Promise.all([
        gamesResponse.ok ? gamesResponse.json() : [],
        creatorsResponse.ok ? creatorsResponse.json() : [],
        sessionsResponse.ok ? sessionsResponse.json() : []
      ])

      // Calcular jugadores activos de manera más realista y conservadora
      const activeCreators = creatorsData.length || 0
      const totalGames = gamesData.length || 0
      const activeSessions = sessionsData.length || 0
      
      // Estimación conservadora: 
      // - Creadores activos (los que realmente están creando)
      // - Más 2-4 jugadores promedio por juego disponible
      // - Más jugadores en sesiones QR activas
      const baseActivePlayers = activeCreators
      const playersFromGames = totalGames * 3 // 3 jugadores promedio por juego
      const playersFromSessions = activeSessions * 2 // 2 jugadores promedio por sesión QR
      
      const estimatedActivePlayers = baseActivePlayers + playersFromGames + playersFromSessions
      
      // Partidas jugadas: estimación más realista
      // Basado en: juegos disponibles * factor de uso moderado
      const estimatedMatches = (totalGames * 12) + (activeCreators * 8) + (activeSessions * 5)

      const stats = {
        totalGames: totalGames,
        activeUsers: Math.min(estimatedActivePlayers, 85), // Máximo más realista de 85
        activeSessions: activeSessions,
        totalMatches: Math.max(estimatedMatches, 0)
      }

      return { data: stats, error: null }

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido al obtener estadísticas'
        } 
      }
    }
  },

  // Obtener estadísticas específicas de un usuario (para admin panel)
  getUserStatistics: async (userId: string) => {
    try {
      
      // Obtener token del localStorage
      let authToken = null
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        if (storedSession) {
          const session = JSON.parse(storedSession)
          authToken = session?.access_token
        }
      } catch (e) {}

      // Obtener estadísticas del usuario en paralelo
      const [gamesResponse, qrSessionsResponse] = await Promise.all([
        // Juegos creados por el usuario
        fetch(`${supabaseUrl}/rest/v1/games?select=id,title,created_at,questions(count)&created_by_user=eq.${userId}`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          }
        }),
        
        // Sesiones QR creadas por el usuario
        fetch(`${supabaseUrl}/rest/v1/qr_game_sessions?select=id&created_by_user=eq.${userId}&is_active=eq.true`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          }
        }),

      ])

      const [gamesData, qrSessionsData] = await Promise.all([
        gamesResponse.ok ? gamesResponse.json() : [],
        qrSessionsResponse.ok ? qrSessionsResponse.json() : [],
      ])

      // Calcular estadísticas realistas para el usuario específico
      const userGamesCount = gamesData.length || 0
      const userQRSessions = qrSessionsData.length || 0
      
      // Jugadores activos: estimación conservadora basada en actividad real del usuario
      let estimatedActivePlayers
      if (userGamesCount > 0) {
        // Si tiene juegos: 4-8 jugadores promedio por juego
        estimatedActivePlayers = userGamesCount * 6 + userQRSessions * 3
      } else {
        // Si no tiene juegos: entre 0-5 jugadores potenciales
        estimatedActivePlayers = userQRSessions * 2
      }
      
      // Partidas jugadas: basado en juegos y sesiones reales
      const estimatedMatches = (userGamesCount * 8) + (userQRSessions * 5) + 3

      const stats = {
        gamesCreated: gamesData.length || 0,
        qrSessions: qrSessionsData.length || 0,
        activePlayers: estimatedActivePlayers,
        totalMatches: estimatedMatches,
        recentGames: gamesData.slice(0, 3).map((game: any) => ({
          id: game.id,
          title: game.title,
          questions: Math.floor(Math.random() * 20) + 5, // Simulado por ahora
          plays: Math.floor(Math.random() * 100) + 10,
          created: formatRelativeTime(game.created_at)
        }))
      }

      return { data: stats, error: null }

    } catch (error) {
      console.error('Error obteniendo estadísticas de usuario:', error)
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Error desconocido al obtener estadísticas de usuario'
        } 
      }
    }
  }
}

// Función auxiliar para obtener IDs de juegos del usuario (actualmente no utilizada)
// const getUserGameIds = async (userId: string, authToken: string | null) => {
//   try {
//     const response = await fetch(`${supabaseUrl}/rest/v1/games?select=id&created_by_user=eq.${userId}`, {
//       headers: {
//         'apikey': supabaseAnonKey,
//         'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
//       }
//     })
    
//     if (response.ok) {
//       const games = await response.json()
//       return games.map((g: any) => g.id).join(',')
//     }
//     return ''
//   } catch {
//     return ''
//   }
// }

// Función auxiliar para formatear tiempo relativo
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return '1 día'
  if (diffDays < 7) return `${diffDays} días`
  if (diffDays < 14) return '1 semana'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas`
  return `${Math.floor(diffDays / 30)} meses`
}

// Función de prueba para verificar conectividad
export const testConnection = async () => {
  try {
    console.log('🔗 Testing Supabase connection...')
    
    // Probar consulta simple
    const { error, count } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Connection test failed:', error)
      return { success: false, error }
    } else {
      console.log(`✅ Connection successful! Found ${count} rooms in database`)
      return { success: true, count }
    }
  } catch (err) {
    console.error('💥 Connection test exception:', err)
    return { success: false, error: err }
  }
}

// Funciones para salas multijugador
export const roomHelpers = {
  // Crear una nueva sala
  createRoom: async (name: string, code: string, userId: string, maxPlayers: number = 20) => {
    const { data, error } = await supabase
      .from('rooms')
      .insert([
        {
          name,
          code,
          created_by_user: userId,
          status: 'waiting',
          max_players: maxPlayers
        }
      ])
      .select()
      .single()
    return { data, error }
  },

  // Buscar sala por código
  findRoomByCode: async (code: string) => {
    try {
      console.log('🔍 Searching for room with code:', code)
      
      // Primero obtener la sala básica
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .single()
      
      if (roomError) {
        console.log('❌ Room query error:', roomError)
        return { data: null, error: roomError }
      }
      
      if (!roomData) {
        console.log('❌ No room found with code:', code)
        return { data: null, error: { message: 'Room not found', code: 'ROOM_NOT_FOUND' } }
      }
      
      console.log('✅ Room found:', roomData)
      
      // Luego obtener los jugadores de la sala
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id)
        .order('joined_at', { ascending: true })
      
      if (playersError) {
        console.log('⚠️ Players query error:', playersError)
        // Continuar sin jugadores si hay error
      }
      
      // Combinar los datos
      const completeRoomData = {
        ...roomData,
        players: playersData || []
      }
      
      console.log('✅ Complete room data:', completeRoomData)
      return { data: completeRoomData, error: null }
      
    } catch (err) {
      console.error('💥 Unexpected error in findRoomByCode:', err)
      return { 
        data: null, 
        error: { 
          message: 'Error inesperado al buscar la sala',
          originalError: err 
        } 
      }
    }
  },

  // Unirse a una sala como jugador
  joinRoom: async (roomId: string, playerName: string, avatar: string, isHost = false) => {
    try {
      console.log('🎮 Attempting to join room:', { roomId, playerName, avatar, isHost })
      
      const playerData = {
        room_id: roomId,
        name: playerName,
        avatar,
        is_host: isHost,
        score: 0
      }
      
      const { data, error } = await supabase
        .from('players')
        .insert([playerData])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Join room error:', error)
        
        // Mejorar mensajes de error específicos
        if (error.code === '23505') {
          return { 
            data: null, 
            error: { 
              ...error, 
              message: 'Ya existe un jugador con ese nombre en la sala' 
            } 
          }
        }
        
        if (error.message?.includes('violates check constraint')) {
          return { 
            data: null, 
            error: { 
              ...error, 
              message: 'Datos del jugador no válidos' 
            } 
          }
        }
      } else {
        console.log('✅ Successfully joined room:', data)
      }
      
      return { data, error }
    } catch (err) {
      console.error('💥 Unexpected error in joinRoom:', err)
      return { 
        data: null, 
        error: { 
          message: 'Error inesperado al unirse a la sala',
          originalError: err 
        } 
      }
    }
  },

  // Obtener jugadores de una sala
  getRoomPlayers: async (roomId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })
    return { data, error }
  },

  // Actualizar estado de la sala
  updateRoomStatus: async (roomId: string, status: string) => {
    const { data, error } = await supabase
      .from('rooms')
      .update({ status })
      .eq('id', roomId)
      .select()
      .single()
    return { data, error }
  },

  // Actualizar sala con estado y juego
  updateRoomWithGame: async (roomId: string, status: string, game: any) => {
    console.log('🎯 Updating room with game:', { roomId, status, gameTitle: game?.title, gameQuestions: game?.questions?.length })
    
    const { data, error } = await supabase
      .from('rooms')
      .update({ 
        status,
        current_game_data: game // Almacenar el juego completo
      })
      .eq('id', roomId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating room with game:', error)
    } else {
      console.log('✅ Room updated with game successfully')
    }
    
    return { data, error }
  },

  // Actualizar puntuación de jugador
  updatePlayerScore: async (playerId: string, score: number) => {
    const { data, error } = await supabase
      .from('players')
      .update({ score })
      .eq('id', playerId)
      .select()
      .single()
    return { data, error }
  },

  // Crear sesión de juego para una sala
  createGameSession: async (roomId: string, gameId: string) => {
    try {
      console.log('🎮 Creating game session for room:', roomId, 'with game:', gameId)
      
      const sessionData = {
        room_id: roomId,
        game_id: gameId,
        current_question: 0
      }
      
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([sessionData])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error creating game session:', error)
      } else {
        console.log('✅ Game session created successfully:', data)
      }
      
      return { data, error }
    } catch (err) {
      console.error('💥 Unexpected error in createGameSession:', err)
      return { 
        data: null, 
        error: { 
          message: 'Error inesperado al crear sesión de juego',
          originalError: err 
        } 
      }
    }
  },

  // Crear sesión de juego con datos completos del juego
  createGameSessionWithFullGame: async (roomId: string, gameId: string, fullGameData: any) => {
    try {
      console.log('🎯 Creating game session with full game data:', fullGameData?.title, 'Questions:', fullGameData?.questions?.length)
      
      const sessionData = {
        room_id: roomId,
        game_id: gameId,
        current_question: 0,
        game_data: fullGameData // Almacenar el juego completo
      }
      
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([sessionData])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error creating game session with full data:', error)
      } else {
        console.log('✅ Game session with full data created successfully:', data)
      }
      
      return { data, error }
    } catch (err) {
      console.error('💥 Unexpected error in createGameSessionWithFullGame:', err)
      return { 
        data: null, 
        error: { 
          message: 'Error inesperado al crear sesión de juego completa',
          originalError: err 
        } 
      }
    }
  },

  // Obtener sesión de juego activa de una sala
  getRoomGameSession: async (roomId: string) => {
    try {
      console.log('🔍 Getting game session for room:', roomId)
      
      // Primero obtener la sesión básica
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_id', roomId)
        .single()
      
      if (sessionError) {
        console.error('❌ Error getting game session:', sessionError)
        return { data: null, error: sessionError }
      }
      
      if (!sessionData) {
        console.log('❌ No game session found for room:', roomId)
        return { 
          data: null, 
          error: { 
            message: 'No se encontró sesión de juego para esta sala',
            code: 'SESSION_NOT_FOUND' 
          } 
        }
      }
      
      console.log('✅ Game session found:', sessionData)
      
      // Luego obtener los datos del juego por separado
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', sessionData.game_id)
        .single()
      
      if (gameError) {
        console.log('⚠️ Game data query error:', gameError)
        // Continuar sin datos de juego si hay error
      }
      
      // Combinar los datos
      const completeSessionData = {
        ...sessionData,
        games: gameData
      }
      
      console.log('✅ Complete session data:', completeSessionData)
      return { data: completeSessionData, error: null }
      
    } catch (err) {
      console.error('💥 Unexpected error in getRoomGameSession:', err)
      return { 
        data: null, 
        error: { 
          message: 'Error inesperado al obtener sesión de juego',
          originalError: err 
        } 
      }
    }
  }
}

// Funciones para sesiones QR
export const qrHelpers = {
  // Crear sesión QR
  createQRSession: async (accessCode: string, gameId: string, title: string, description: string, userId: string, maxParticipants: number = 50, activeTimeHours: number = 24) => {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + activeTimeHours)
    
    const { data, error } = await supabase
      .from('qr_game_sessions')
      .insert([
        {
          access_code: accessCode,
          game_id: gameId,
          title,
          description,
          created_by_user: userId,
          max_participants: maxParticipants,
          expires_at: expiresAt.toISOString(),
          is_active: true
        }
      ])
      .select()
      .single()
    return { data, error }
  },

  // Buscar sesión QR por código
  findQRSession: async (accessCode: string) => {
    const { data, error } = await supabase
      .from('qr_game_sessions')
      .select(`
        *,
        games (
          *,
          questions (*)
        )
      `)
      .eq('access_code', accessCode)
      .eq('is_active', true)
      .single()
    return { data, error }
  },

  // Obtener todas las sesiones QR de un usuario
  getUserQRSessions: async (userId: string) => {
    const { data, error } = await supabase
      .from('qr_game_sessions')
      .select(`
        *,
        games (*)
      `)
      .eq('created_by_user', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Desactivar sesión QR
  deactivateQRSession: async (sessionId: string) => {
    const { data, error } = await supabase
      .from('qr_game_sessions')
      .update({ is_active: false })
      .eq('id', sessionId)
      .select()
      .single()
    return { data, error }
  }
}

// Funciones para respuestas y sesiones de juego
export const sessionHelpers = {

  // Registrar respuesta de jugador
  recordPlayerAnswer: async (playerId: string, questionId: string, sessionId: string, answer: number, timeToAnswer: number, isCorrect: boolean, pointsEarned: number) => {
    const { data, error } = await supabase
      .from('player_answers')
      .insert([
        {
          player_id: playerId,
          question_id: questionId,
          session_id: sessionId,
          answer,
          time_to_answer: timeToAnswer,
          is_correct: isCorrect,
          points_earned: pointsEarned
        }
      ])
      .select()
      .single()
    return { data, error }
  },

  // Avanzar a siguiente pregunta
  nextQuestion: async (sessionId: string, currentQuestion: number) => {
    const { data, error } = await supabase
      .from('game_sessions')
      .update({ current_question: currentQuestion + 1 })
      .eq('id', sessionId)
      .select()
      .single()
    return { data, error }
  }
}

// Suscripciones en tiempo real
export const realtimeHelpers = {
  // Suscribirse a cambios en jugadores de una sala
  subscribeToRoomPlayers: (roomId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`room-${roomId}-players`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        callback
      )
      .subscribe()
  },

  // Suscribirse a cambios en una sala
  subscribeToRoom: (roomId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        callback
      )
      .subscribe()
  },

  // Suscribirse a respuestas de una sesión
  subscribeToSessionAnswers: (sessionId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`session-${sessionId}-answers`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_answers',
          filter: `session_id=eq.${sessionId}`
        },
        callback
      )
      .subscribe()
  },

  // Suscribirse a cambios en sesiones de juego
  subscribeToGameSession: (roomId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`room-${roomId}-game-session`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `room_id=eq.${roomId}`
        },
        callback
      )
      .subscribe()
  },

  // Desuscribirse de un canal
  unsubscribe: (subscription: any) => {
    return supabase.removeChannel(subscription)
  }
}

// Funciones para resultados de sesiones QR
export const qrResultsHelpers = {
  // Guardar resultado de jugador en sesión QR (con UPSERT para evitar duplicados)
  saveQRSessionResult: async (qrSessionId: string, playerName: string, totalScore: number, totalCorrect: number, totalQuestions: number, avgTime: number, gameData: any) => {
    // Usar upsert para actualizar si ya existe o insertar si no
    const { data, error } = await supabase
      .from('qr_session_results')
      .upsert(
        {
          qr_session_id: qrSessionId,
          player_name: playerName.trim(), // Normalizar nombre
          total_score: totalScore,
          total_correct: totalCorrect,
          total_questions: totalQuestions,
          avg_time: avgTime,
          game_data: gameData,
          completed_at: new Date().toISOString()
        },
        {
          onConflict: 'qr_session_id,player_name', // Especificar qué campos usar para detectar conflictos
          ignoreDuplicates: false // Actualizar en caso de conflicto
        }
      )
      .select()
      .single()
    return { data, error }
  },

  // Obtener leaderboard de una sesión QR
  getQRSessionLeaderboard: async (qrSessionId: string) => {
    const { data, error } = await supabase
      .from('qr_session_results')
      .select('*')
      .eq('qr_session_id', qrSessionId)
      .order('total_score', { ascending: false })
      .order('avg_time', { ascending: true })
      .limit(10)
    return { data, error }
  },

  // Verificar si un jugador ya jugó esta sesión
  checkPlayerPlayed: async (qrSessionId: string, playerName: string) => {
    const { data, error } = await supabase
      .from('qr_session_results')
      .select('id, total_score, completed_at')
      .eq('qr_session_id', qrSessionId)
      .eq('player_name', playerName)
      .order('completed_at', { ascending: false })
      .limit(1)
    return { data, error }
  },

  // Obtener estadísticas de la sesión
  getQRSessionStats: async (qrSessionId: string) => {
    const { data, error } = await supabase
      .from('qr_session_results')
      .select('total_score, total_correct, total_questions')
      .eq('qr_session_id', qrSessionId)
    
    if (error) return { data: null, error }
    
    const stats = {
      total_players: data.length,
      avg_score: data.length > 0 ? Math.round(data.reduce((acc, r) => acc + r.total_score, 0) / data.length) : 0,
      best_score: data.length > 0 ? Math.max(...data.map(r => r.total_score)) : 0,
      avg_accuracy: data.length > 0 ? Math.round((data.reduce((acc, r) => acc + (r.total_correct / r.total_questions), 0) / data.length) * 100) : 0
    }
    
    return { data: stats, error: null }
  }
}

export default supabase