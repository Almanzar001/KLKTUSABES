import React, { useState, useEffect } from 'react'
import { ArrowLeft, Users, Crown, Play } from 'lucide-react'
// import { useAuth } from '../contexts/AuthContext' // Currently unused
import { roomHelpers, realtimeHelpers, gameHelpers, supabase } from '../supabase'
import { Room, Player, Game } from '../types'
import { useGameSounds } from '../hooks/useGameSounds'
import GameSelector from './GameSelector'

interface MultiplayerRoomProps {
  room: Room
  player: Player
  onBack: () => void
}

type RoomState = 'lobby' | 'game-select' | 'playing' | 'results' | 'finished'
type GameState = 'waiting' | 'question' | 'answer' | 'leaderboard'

const MultiplayerRoom: React.FC<MultiplayerRoomProps> = ({ room: initialRoom, player, onBack }) => {
  // const { user } = useAuth() // Currently unused
  const { playCorrect, playIncorrect, playTick, playTimeUp, playGameStart } = useGameSounds()

  // Estados principales
  const [room, setRoom] = useState<Room>(initialRoom)
  const [players, setPlayers] = useState<Player[]>([])
  const [roomState, setRoomState] = useState<RoomState>(
    initialRoom.status === 'playing' && (initialRoom.current_game_data || initialRoom.game) ? 'playing' : 'lobby'
  )
  const [gameState, setGameState] = useState<GameState>(
    initialRoom.status === 'playing' && (initialRoom.current_game_data || initialRoom.game) ? 'question' : 'waiting'
  )
  const [games, setGames] = useState<Game[]>([])
  
  // Estados del juego
  const [currentGame, setCurrentGame] = useState<Game | null>(
    initialRoom.current_game_data || initialRoom.game || null
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [playerAnswers, setPlayerAnswers] = useState<{[playerId: string]: number | null}>({})
  const [waitingForPlayers, setWaitingForPlayers] = useState(false)
  
  // Estados de la UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar jugadores inicial y juegos
  useEffect(() => {
    loadPlayers()
    loadGames()
    
    // Si ya hay un juego cargado, inicializar timer
    if ((initialRoom.game || initialRoom.current_game_data) && roomState === 'playing') {
      const gameToUse = initialRoom.current_game_data || initialRoom.game
      setTimeLeft(gameToUse?.questions?.[0]?.time_limit || 30)
      console.log('🎯 Initial game loaded:', gameToUse?.title, 'Questions:', gameToUse?.questions?.length)
    }
  }, [])

  // Suscribirse a cambios en jugadores
  useEffect(() => {
    const subscription = realtimeHelpers.subscribeToRoomPlayers(
      room.id,
      (payload) => {
        console.log('Players changed:', payload)
        loadPlayers()
      }
    )

    return () => {
      realtimeHelpers.unsubscribe(subscription)
    }
  }, [room.id])

  // Suscribirse a cambios en la sala
  useEffect(() => {
    const subscription = realtimeHelpers.subscribeToRoom(
      room.id,
      (payload) => {
        console.log('🔄 Room changed:', payload)
        console.log('🎮 Current player:', player.name, 'Is host:', player.is_host)
        
        if (payload.new?.status !== room.status) {
          console.log('📦 Room update payload:', payload.new)
          setRoom(prev => ({ ...prev, ...payload.new }))
          
          if (payload.new.status === 'playing') {
            console.log('🚀 Starting game for:', player.name)
            
            if (player.is_host) {
              // El host ya tiene el juego, no necesita cargarlo de nuevo
              console.log('🏠 Host already has game, skipping load')
              setRoomState('playing')
              setGameState('question')
            } else {
              // Los participantes necesitan cargar el juego desde game_sessions
              console.log('👥 Participant loading game...')
              handleGameStart()
            }
          }
        }
      }
    )

    return () => {
      realtimeHelpers.unsubscribe(subscription)
    }
  }, [room.id])

  // Suscribirse a cambios en game_sessions para recibir el juego (TODOS los jugadores)
  useEffect(() => {
    const subscription = realtimeHelpers.subscribeToGameSession(
      room.id,
      async (payload) => {
        console.log('🎯 Game session changed:', payload)
        
        if (payload.eventType === 'INSERT' && payload.new) {
          // Se creó una nueva sesión de juego
          console.log(`🎮 New game session detected for ${player.name}`)
          
          if (!player.is_host) {
            // Los participantes intentan múltiples estrategias para obtener el juego
            console.log('🔄 Participant trying to load game data...')
            
            // Estrategia 1: localStorage
            try {
              const storedGameData = localStorage.getItem(`game-data-${room.id}`)
              if (storedGameData) {
                const gameData = JSON.parse(storedGameData)
                console.log('✅ Game loaded from localStorage for participant:', gameData.title, 'Questions:', gameData.questions?.length)
                setCurrentGame(gameData)
                setRoomState('playing')
                setGameState('question')
                setTimeLeft(gameData.questions?.[0]?.time_limit || 30)
                return
              }
            } catch (err) {
              console.log('⚠️ No game data in localStorage for participant')
            }
            
            // Estrategia 2: Intentar obtener directamente el juego con fetch básico
            try {
              console.log('🔄 Trying basic game fetch for:', payload.new.game_id)
              const { data: basicGameData } = await supabase
                .from('games')
                .select('*, questions(*)')
                .eq('id', payload.new.game_id)
                .single()
              
              if (basicGameData) {
                console.log('✅ Game loaded via basic fetch for participant:', basicGameData.title, 'Questions:', basicGameData.questions?.length)
                setCurrentGame(basicGameData)
                setRoomState('playing')
                setGameState('question')
                setTimeLeft(basicGameData.questions?.[0]?.time_limit || 30)
                return
              }
            } catch (err) {
              console.log('⚠️ Basic game fetch failed:', err)
            }
            
            // Fallback: usar datos básicos y esperar que funcione
            console.log('⚠️ Participant will use basic game data, may not have questions')
            setRoomState('playing')
            setGameState('question')
            setError('Conectando al juego...')
            
            // Intentar obtener el juego de la sesión existente
            setTimeout(async () => {
              try {
                const { data: sessionData, error: sessionError } = await roomHelpers.getRoomGameSession(room.id)
                if (!sessionError && sessionData?.games) {
                  console.log('✅ Game loaded from session for participant:', sessionData.games.title)
                  setCurrentGame(sessionData.games)
                  setError(null)
                  setTimeLeft(sessionData.games.questions?.[0]?.time_limit || 30)
                }
              } catch (err) {
                console.error('❌ Final fallback failed:', err)
              }
            }, 1000)
          }
        }
      }
    )

    return () => {
      realtimeHelpers.unsubscribe(subscription)
    }
  }, [room.id, player.is_host, player.name])

  // Suscribirse a Broadcast Channel para recibir datos de juego
  useEffect(() => {
    if (player.is_host) return // El host no necesita escuchar
    
    const gameChannel = new BroadcastChannel(`game-${room.id}`)
    
    gameChannel.onmessage = (event) => {
      console.log('📡 Broadcast message received by participant:', event.data)
      
      if (event.data.type === 'GAME_DATA' && event.data.game) {
        console.log('✅ Game data received via broadcast:', event.data.game.title, 'Questions:', event.data.game.questions?.length)
        setCurrentGame(event.data.game)
        if (roomState === 'playing') {
          setGameState('question')
          setTimeLeft(event.data.game.questions?.[0]?.time_limit || 30)
          setError(null)
        }
      }
    }
    
    return () => {
      gameChannel.close()
    }
  }, [room.id, player.is_host, roomState])

  // Efecto especial para el host: iniciar el juego automáticamente si ya tiene los datos
  useEffect(() => {
    if (player.is_host && roomState === 'playing' && currentGame && gameState === 'waiting') {
      console.log('🏠 Host auto-starting game with current data')
      setGameState('question')
      if (currentGame.questions?.[0]) {
        setTimeLeft(currentGame.questions[0].time_limit || 30)
      }
    }
  }, [player.is_host, roomState, currentGame, gameState])

  // Timer del juego
  useEffect(() => {
    if (gameState !== 'question' || showAnswer) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        
        const newTime = prev - 1
        
        // Sonidos del temporizador
        if (newTime <= 10 && newTime > 5) {
          playTick()
        } else if (newTime <= 5 && newTime > 0) {
          playTick()
        }
        
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState, showAnswer, playTick])

  const loadPlayers = async () => {
    try {
      const { data, error } = await roomHelpers.getRoomPlayers(room.id)
      if (error) {
        console.error('Error loading players:', error)
        return
      }
      setPlayers(data || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const loadGames = async () => {
    try {
      const { data, error } = await gameHelpers.getAllGames()
      if (error) {
        console.error('Error loading games:', error)
        return
      }
      setGames(data || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleStartGameSetup = () => {
    setRoomState('game-select')
  }

  const handleGameSelected = async (selectedGame: Game) => {
    try {
      setLoading(true)
      setError(null)
      
      // Crear sesión de juego
      const { error: sessionError } = await roomHelpers.createGameSession(
        room.id, 
        selectedGame.id
      )
      
      if (sessionError) {
        setError('Error al crear la sesión de juego')
        console.error('Session error:', sessionError)
        return
      }
      
      // Actualizar estado de la sala a 'playing'
      const { error: roomError } = await roomHelpers.updateRoomStatus(room.id, 'playing')
      
      if (roomError) {
        setError('Error al iniciar el juego')
        console.error('Room error:', roomError)
        return
      }
      
      // Cargar el juego completo con sus preguntas
      const { data: fullGameData, error: gameError } = await gameHelpers.getGameWithQuestions(selectedGame.id)
      
      if (gameError || !fullGameData) {
        setError('Error al cargar las preguntas del juego')
        console.error('Game loading error:', gameError)
        return
      }
      
      console.log('✅ Full game data loaded:', fullGameData)
      console.log('✅ Questions count:', fullGameData.questions?.length || 0)
      
      setCurrentGame(fullGameData)
      setRoom(prev => ({ ...prev, status: 'playing' }))
      
      // Iniciar el juego directamente
      setRoomState('playing')
      setGameState('question')
      setCurrentQuestionIndex(0)
      setTimeLeft(fullGameData.questions?.[0]?.time_limit || 30)
      playGameStart()
    } catch (err) {
      setError('Error al iniciar el juego')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGameStart = async () => {
    try {
      console.log(`🎮 HandleGameStart called for player: ${player.name} (${player.is_host ? 'HOST' : 'PARTICIPANT'})`)
      setLoading(true)
      
      // Obtener la sesión de juego
      console.log('🔍 Fetching game session for room:', room.id)
      const { data: sessionData, error: sessionError } = await roomHelpers.getRoomGameSession(room.id)
      
      if (sessionError || !sessionData) {
        console.error('❌ Session error for', player.name, ':', sessionError)
        setError('Error al cargar el juego: ' + (sessionError?.message || 'No data'))
        return
      }

      console.log('✅ Session data loaded for', player.name, ':', sessionData)
      console.log('✅ Game questions count:', sessionData.games?.questions?.length || 0)
      
      setCurrentGame(sessionData.games)
      setRoomState('playing')
      setGameState('question')
      setCurrentQuestionIndex(0)
      setTimeLeft(sessionData.games?.questions?.[0]?.time_limit || 30)
      playGameStart()
    } catch (err) {
      setError('Error al iniciar el juego')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null || showAnswer || waitingForPlayers) return

    setSelectedAnswer(answerIndex)
    
    const currentQuestion = currentGame?.questions?.[currentQuestionIndex]
    if (!currentQuestion) return

    // Actualizar las respuestas locales
    const newPlayerAnswers = {
      ...playerAnswers,
      [player.id]: answerIndex
    }
    setPlayerAnswers(newPlayerAnswers)
    
    // Reproducir sonido basado en si es correcto
    const isCorrect = answerIndex === currentQuestion.correct_answer
    if (isCorrect) {
      playCorrect()
    } else {
      playIncorrect()
    }

    // TODO: Enviar respuesta al servidor
    
    // Verificar si todos los jugadores han respondido
    const totalPlayers = players.length
    const answeredPlayers = Object.keys(newPlayerAnswers).filter(id => newPlayerAnswers[id] !== null).length
    
    console.log(`📊 Progreso respuestas: ${answeredPlayers}/${totalPlayers}`)
    
    if (answeredPlayers === totalPlayers) {
      // Todos han respondido, mostrar respuestas
      setShowAnswer(true)
      setWaitingForPlayers(false)
      
      // NO avanzar automáticamente - esperar que el host presione el botón
    } else {
      // Esperar a que otros respondan
      setWaitingForPlayers(true)
    }
  }

  const handleTimeUp = () => {
    if (showAnswer) return
    
    playTimeUp()
    setShowAnswer(true)
    setWaitingForPlayers(false)
    
    // Si no respondió, marcar como null
    if (selectedAnswer === null) {
      setPlayerAnswers(prev => ({
        ...prev,
        [player.id]: null
      }))
    }
    
    // TODO: Registrar respuesta por tiempo agotado
    
    // NO avanzar automáticamente - mostrar botón para el host
  }

  const handleNextQuestion = () => {
    if (!currentGame?.questions) return

    const nextIndex = currentQuestionIndex + 1
    
    if (nextIndex < currentGame.questions.length) {
      // Resetear estados para la siguiente pregunta
      setCurrentQuestionIndex(nextIndex)
      setSelectedAnswer(null)
      setShowAnswer(false)
      setPlayerAnswers({}) // Limpiar respuestas anteriores
      setWaitingForPlayers(false)
      setTimeLeft(currentGame.questions[nextIndex].time_limit || 30)
      setGameState('question')
    } else {
      setRoomState('results')
      setGameState('leaderboard')
    }
  }

  const isHost = player.is_host

  // Renderizar lobby
  if (roomState === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="text-dominican-blue hover:text-dominican-blue-light"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{room.name}</h1>
                  <p className="text-gray-600">Código: {room.code}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-800">
                  {players.length}/{room.max_players}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Lista de jugadores */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Jugadores en la Sala</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-lg border-2 ${
                    p.id === player.id 
                      ? 'border-dominican-blue bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-lg">{p.avatar}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{p.name}</span>
                        {p.is_host && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <p className="text-sm text-gray-600">
                        {p.id === player.id ? 'Tú' : 'Jugador'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controles del host */}
          {isHost && (
            <div className="bg-gradient-to-r from-dominican-blue to-dominican-blue-light rounded-xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">Panel del Host</h3>
              <p className="mb-4">
                {players.length < 2 
                  ? 'Esperando más jugadores...' 
                  : `¡Listos para jugar! ${players.length} jugadores conectados`
                }
              </p>
              
              {room.status === 'waiting' && players.length >= 2 && (
                <button
                  onClick={handleStartGameSetup}
                  disabled={loading}
                  className="btn-dominican-secondary"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {loading ? 'Iniciando...' : 'Iniciar Juego'}
                </button>
              )}
            </div>
          )}

          {/* Mensaje para jugadores no host */}
          {!isHost && (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Esperando al Host
              </h3>
              <p className="text-gray-600">
                El host iniciará el juego cuando esté listo
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Renderizar selector de juegos
  if (roomState === 'game-select') {
    return (
      <GameSelector
        games={games}
        onSelectGame={handleGameSelected}
        onBack={() => setRoomState('lobby')}
        title={`Selecciona un Juego para ${room.name}`}
      />
    )
  }

  // Debug: mostrar estado actual
  console.log('🎯 MultiplayerRoom Debug:', {
    roomState,
    gameState,
    currentGame: currentGame?.title || 'No game',
    currentQuestionIndex,
    hasQuestions: !!currentGame?.questions?.length,
    initialRoomGame: initialRoom.game?.title || 'No initial game',
    initialRoomGameQuestions: initialRoom.game?.questions?.length || 0
  })

  // Renderizar juego activo
  if (roomState === 'playing' && currentGame && gameState === 'question') {
    const currentQuestion = currentGame.questions?.[currentQuestionIndex]
    if (!currentQuestion) return null

    const progress = ((currentQuestionIndex + 1) / (currentGame.questions?.length || 1)) * 100

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header del juego */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-800">{currentGame.title}</h1>
                <p className="text-gray-600">Sala: {room.name}</p>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Temporizador */}
                <div className="relative flex items-center justify-center">
                  <svg
                    className={`w-16 h-16 ${
                      timeLeft <= 5 
                        ? 'timer-critical' 
                        : timeLeft <= 10 
                        ? 'timer-warning' 
                        : 'timer-normal transform -rotate-90'
                    }`}
                    viewBox="0 0 64 64"
                  >
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                    <circle
                      cx="32" cy="32" r="28" fill="none"
                      stroke={timeLeft <= 5 ? '#dc2626' : timeLeft <= 10 ? '#f59e0b' : '#10b981'}
                      strokeWidth="4"
                      strokeDasharray={`${(timeLeft / currentQuestion.time_limit) * 175.929} 175.929`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-bold text-lg ${
                      timeLeft <= 5 ? 'text-red-600' : timeLeft <= 10 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {timeLeft}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div className="font-semibold">
                    Pregunta {currentQuestionIndex + 1} de {currentGame.questions?.length || 0}
                  </div>
                  <div className="text-xs">
                    {players.length} jugadores
                  </div>
                </div>
              </div>
            </div>
            
            {/* Barra de progreso */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-dominican-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Pregunta */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="question-card">
            {currentQuestion.image_url && (
              <div className="mb-6">
                <img
                  src={currentQuestion.image_url}
                  alt="Imagen de la pregunta"
                  className="max-w-full h-64 object-cover rounded-lg mx-auto"
                />
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              {currentQuestion.text}
            </h2>
            
            {/* Progreso de respuestas tipo Kahoot */}
            {(waitingForPlayers || showAnswer) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                {waitingForPlayers ? (
                  <div>
                    <p className="text-blue-800 font-semibold">
                      Esperando respuestas...
                    </p>
                    <p className="text-blue-600 text-sm">
                      {Object.keys(playerAnswers).filter(id => playerAnswers[id] !== null).length} de {players.length} jugadores han respondido
                    </p>
                  </div>
                ) : showAnswer && (
                  <p className="text-green-800 font-semibold">
                    ¡Todos los jugadores han respondido!
                  </p>
                )}
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showAnswer}
                  className={`answer-option ${
                    showAnswer
                      ? selectedAnswer === index && selectedAnswer === currentQuestion.correct_answer
                        ? 'answer-option-correct'
                        : selectedAnswer === index
                        ? 'answer-option-incorrect'
                        : ''
                      : selectedAnswer === index
                      ? 'answer-option-selected'
                      : ''
                  }`}
                >
                  <span>{option}</span>
                </button>
              ))}
            </div>

            {showAnswer && (
              <div className="mt-8 text-center">
                <div className={`text-2xl font-bold mb-4 ${
                  selectedAnswer === currentQuestion.correct_answer ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedAnswer === currentQuestion.correct_answer 
                    ? '¡Correcto!' 
                    : selectedAnswer === null 
                    ? '¡Tiempo Agotado!' 
                    : '¡Incorrecto!'
                  }
                </div>
                
                {/* Controles del host para avanzar */}
                {player.is_host ? (
                  <div className="space-y-4">
                    <div className="text-lg text-gray-600 mb-4">
                      Todos los jugadores han respondido
                    </div>
                    
                    {currentQuestionIndex + 1 < (currentGame?.questions?.length || 0) ? (
                      <button
                        onClick={handleNextQuestion}
                        className="btn-dominican-primary px-8 py-3 text-lg"
                      >
                        ▶️ Siguiente Pregunta ({currentQuestionIndex + 2} de {currentGame?.questions?.length})
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="btn-dominican-primary px-8 py-3 text-lg"
                      >
                        🏁 Ver Resultados
                      </button>
                    )}
                    
                    <div className="text-sm text-gray-500">
                      Solo el host puede avanzar a la siguiente pregunta
                    </div>
                  </div>
                ) : (
                  <div className="text-lg text-gray-600">
                    Esperando que el host avance a la siguiente pregunta...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Renderizar resultados
  if (roomState === 'results') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            ¡Juego Terminado!
          </h2>
          <p className="text-gray-600 mb-8">
            Tabla de posiciones próximamente...
          </p>
          <button
            onClick={onBack}
            className="btn-dominican-primary"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    )
  }

  // Renderizado por defecto para debugging
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Debug Info</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Room State:</strong> {roomState}</p>
          <p><strong>Game State:</strong> {gameState}</p>
          <p><strong>Current Game:</strong> {currentGame?.title || 'No game selected'}</p>
          <p><strong>Has Questions:</strong> {currentGame?.questions?.length || 0} questions</p>
          <p><strong>Current Question Index:</strong> {currentQuestionIndex}</p>
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          {error && <p className="text-red-600"><strong>Error:</strong> {error}</p>}
        </div>
        <button onClick={onBack} className="btn-dominican-primary mt-4 w-full">
          Volver al Inicio
        </button>
      </div>
    </div>
  )
}

export default MultiplayerRoom