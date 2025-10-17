import React, { useState, useEffect } from 'react'
import { ArrowLeft, Play, Clock, CheckCircle, X, RotateCcw } from 'lucide-react'
import { gameHelpers } from '../supabase'
import { Game, Question, calculatePoints } from '../types'
import GameSelector from './GameSelector'
import { useGameSounds } from '../hooks/useGameSounds'

interface SinglePlayerGameProps {
  onBack: () => void
  game?: Game
  isQRSession?: boolean
  qrSessionTitle?: string
}

interface GameResult {
  totalQuestions: number
  correctAnswers: number
  totalPoints: number
  timeSpent: number
  accuracy: number
}

interface ShuffledQuestion extends Question {
  shuffledOptions: string[]
  correctAnswerIndex: number
}

const SinglePlayerGame: React.FC<SinglePlayerGameProps> = ({ 
  onBack, 
  game: initialGame,
  isQRSession = false,
  qrSessionTitle 
}) => {
  // Hook de sonidos
  const { playCorrect, playIncorrect, playTick, playTimeUp, playGameStart, playGameEnd } = useGameSounds()

  // Estados principales
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(initialGame || null)
  const [shuffledQuestions, setShuffledQuestions] = useState<ShuffledQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [gameState, setGameState] = useState<'select' | 'playing' | 'results'>('select')
  
  // Estados del juego
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [answers, setAnswers] = useState<Array<{
    questionIndex: number
    selectedAnswer: number
    isCorrect: boolean
    timeToAnswer: number
    pointsEarned: number
  }>>([])
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  
  // Estados de la UI
  // const [loading, setLoading] = useState(false) // Currently unused

  // Si es sesión QR y tenemos juego, ir directo a selección
  useEffect(() => {
    if (isQRSession && selectedGame) {
      setGameState('select')
    } else if (!isQRSession) {
      loadGames()
    }
  }, [isQRSession, selectedGame])

  // Timer del juego
  useEffect(() => {
    if (gameState !== 'playing' || showAnswer) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        // Sonido de tick cuando quedan 5 segundos o menos
        if (prev <= 5) {
          playTick()
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState, showAnswer, playTick])

  // Función para mezclar array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Función para mezclar opciones de una pregunta
  const shuffleQuestionOptions = (question: Question): ShuffledQuestion => {
    const optionsWithIndex = question.options.map((option, index) => ({
      option,
      originalIndex: index
    }))
    
    const shuffledOptionsWithIndex = shuffleArray(optionsWithIndex)
    const shuffledOptions = shuffledOptionsWithIndex.map(item => item.option)
    
    // Encontrar el nuevo índice de la respuesta correcta
    const correctAnswerIndex = shuffledOptionsWithIndex.findIndex(
      item => item.originalIndex === question.correct_answer
    )
    
    return {
      ...question,
      shuffledOptions,
      correctAnswerIndex
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

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game)
    // Crear preguntas con opciones mezcladas
    if (game.questions) {
      const shuffled = game.questions.map(question => shuffleQuestionOptions(question))
      setShuffledQuestions(shuffled)
    }
    setGameState('playing')
    startGame()
  }

  const startGame = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setShowAnswer(false)
    setAnswers([])
    setGameStartTime(Date.now())
    
    // Si no hay preguntas mezcladas y tenemos un juego seleccionado, crear las preguntas mezcladas
    if (selectedGame?.questions && shuffledQuestions.length === 0) {
      const shuffled = selectedGame.questions.map(question => shuffleQuestionOptions(question))
      setShuffledQuestions(shuffled)
    }
    
    // Reproducir sonido de inicio de juego
    playGameStart()
    
    if (selectedGame?.questions && selectedGame.questions[0]) {
      setTimeLeft(selectedGame.questions[0].time_limit)
      setQuestionStartTime(Date.now())
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showAnswer || selectedAnswer !== null) return
    
    const currentQuestion = selectedGame?.questions?.[currentQuestionIndex]
    const currentShuffledQuestion = shuffledQuestions[currentQuestionIndex]
    if (!currentQuestion || !currentShuffledQuestion) return

    const timeToAnswer = Date.now() - questionStartTime
    const isCorrect = answerIndex === currentShuffledQuestion.correctAnswerIndex
    const pointsEarned = calculatePoints(isCorrect, timeToAnswer)

    setSelectedAnswer(answerIndex)
    setShowAnswer(true)
    
    // Reproducir sonido según si la respuesta es correcta o incorrecta
    if (isCorrect) {
      playCorrect()
    } else {
      playIncorrect()
    }
    
    // Guardar respuesta
    setAnswers(prev => [...prev, {
      questionIndex: currentQuestionIndex,
      selectedAnswer: answerIndex,
      isCorrect,
      timeToAnswer,
      pointsEarned
    }])

    // Avanzar automáticamente a la siguiente pregunta después de 2 segundos
    setTimeout(() => {
      handleNextQuestion()
    }, 2000)
  }

  const handleTimeUp = () => {
    if (showAnswer || selectedAnswer !== null) return
    
    const timeToAnswer = Date.now() - questionStartTime
    
    // Reproducir sonido de tiempo agotado
    playTimeUp()
    
    // Respuesta por tiempo agotado
    setAnswers(prev => [...prev, {
      questionIndex: currentQuestionIndex,
      selectedAnswer: -1, // -1 indica sin respuesta
      isCorrect: false,
      timeToAnswer,
      pointsEarned: 0
    }])
    
    setShowAnswer(true)

    // Avanzar automáticamente a la siguiente pregunta después de 2 segundos
    setTimeout(() => {
      handleNextQuestion()
    }, 2000)
  }

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1
    
    if (!selectedGame?.questions || nextIndex >= selectedGame.questions.length) {
      // Juego terminado - reproducir sonido de fin de juego
      playGameEnd()
      setGameState('results')
      return
    }

    // Siguiente pregunta
    setCurrentQuestionIndex(nextIndex)
    setSelectedAnswer(null)
    setShowAnswer(false)
    setTimeLeft(selectedGame.questions[nextIndex].time_limit)
    setQuestionStartTime(Date.now())
  }

  const calculateResults = (): GameResult => {
    const totalQuestions = selectedGame?.questions?.length || 0
    const correctAnswers = answers.filter(a => a.isCorrect).length
    const totalPoints = answers.reduce((sum, a) => sum + a.pointsEarned, 0)
    const timeSpent = Math.round((Date.now() - gameStartTime) / 1000)
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

    return {
      totalQuestions,
      correctAnswers,
      totalPoints,
      timeSpent,
      accuracy: Math.round(accuracy)
    }
  }

  const handlePlayAgain = () => {
    // Re-mezclar las preguntas para el nuevo juego
    if (selectedGame?.questions) {
      const shuffled = selectedGame.questions.map(question => shuffleQuestionOptions(question))
      setShuffledQuestions(shuffled)
    }
    setGameState('playing')
    startGame()
  }

  const handleSelectNewGame = () => {
    setSelectedGame(null)
    setGameState('select')
  }

  // Mostrar selector de juegos
  if (gameState === 'select' && !isQRSession) {
    return (
      <GameSelector
        games={games}
        onSelectGame={handleGameSelect}
        onBack={onBack}
        title="Selecciona un Juego Individual"
      />
    )
  }

  // Pantalla de confirmación para sesiones QR
  if (gameState === 'select' && isQRSession && selectedGame) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-dominican-blue hover:text-dominican-blue-light"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">
                {qrSessionTitle || 'Juego Individual'}
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {selectedGame.title}
            </h2>
            
            {selectedGame.description && (
              <p className="text-gray-600 mb-6">
                {selectedGame.description}
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-dominican-blue">
                  {selectedGame.questions?.length || 0}
                </div>
                <p className="text-gray-600">Preguntas</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-dominican-blue">
                  ~{Math.ceil((selectedGame.questions?.reduce((acc, q) => acc + q.time_limit, 0) || 0) / 60)}
                </div>
                <p className="text-gray-600">Minutos</p>
              </div>
            </div>

            <button
              onClick={() => {
                // Crear preguntas mezcladas para sesión QR
                if (selectedGame?.questions) {
                  const shuffled = selectedGame.questions.map(question => shuffleQuestionOptions(question))
                  setShuffledQuestions(shuffled)
                }
                setGameState('playing')
                startGame()
              }}
              className="btn-dominican-primary w-full"
            >
              <Play className="w-5 h-5 mr-2" />
              Comenzar Juego
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Pantalla de juego
  if (gameState === 'playing' && selectedGame?.questions && shuffledQuestions.length > 0) {
    const currentQuestion = selectedGame.questions[currentQuestionIndex]
    const currentShuffledQuestion = shuffledQuestions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / selectedGame.questions.length) * 100

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header con progreso */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="text-dominican-blue hover:text-dominican-blue-light"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">
                  {selectedGame.title}
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span className={`font-bold ${timeLeft <= 5 ? 'text-red-600' : ''}`}>
                    {timeLeft}s
                  </span>
                </div>
                
                <div className="text-sm text-gray-600">
                  {currentQuestionIndex + 1} de {selectedGame.questions.length}
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
            
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
              {currentQuestion.text}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {currentShuffledQuestion.shuffledOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showAnswer}
                  className={`answer-option ${
                    showAnswer
                      ? selectedAnswer === index && selectedAnswer === currentShuffledQuestion.correctAnswerIndex
                        ? 'answer-option-correct'  // Solo mostrar verde si seleccionó la correcta
                        : selectedAnswer === index
                        ? 'answer-option-incorrect' // Solo mostrar rojo en la que seleccionó
                        : ''
                      : selectedAnswer === index
                      ? 'answer-option-selected'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showAnswer && selectedAnswer === index && selectedAnswer === currentShuffledQuestion.correctAnswerIndex && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {showAnswer && selectedAnswer === index && selectedAnswer !== currentShuffledQuestion.correctAnswerIndex && (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {showAnswer && (
              <div className="mt-8 text-center">
                <div className="mb-4">
                  <div className={`text-2xl font-bold mb-2 ${
                    selectedAnswer === currentShuffledQuestion.correctAnswerIndex ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedAnswer === currentShuffledQuestion.correctAnswerIndex 
                      ? '¡Correcto!' 
                      : selectedAnswer === -1 
                      ? '¡Tiempo Agotado!' 
                      : '¡Incorrecto!'
                    }
                  </div>
                  
                  {answers[answers.length - 1] && (
                    <div className="text-lg text-dominican-blue font-semibold">
                      +{answers[answers.length - 1].pointsEarned} puntos
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {currentQuestionIndex + 1 < selectedGame.questions.length 
                    ? 'Siguiente pregunta en unos segundos...' 
                    : 'Calculando resultados...'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Pantalla de resultados
  if (gameState === 'results' && selectedGame) {
    const results = calculateResults()

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-dominican-blue hover:text-dominican-blue-light"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Resultados</h1>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                results.accuracy >= 80 ? 'bg-green-100' :
                results.accuracy >= 60 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <span className={`text-3xl ${
                  results.accuracy >= 80 ? 'text-green-600' :
                  results.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {results.accuracy >= 80 ? '🎉' : results.accuracy >= 60 ? '👍' : '😅'}
                </span>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                ¡Juego Completado!
              </h2>
              
              <p className="text-gray-600">
                {selectedGame.title}
              </p>
            </div>

            {/* Estadísticas principales */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{results.totalPoints}</div>
                <p className="text-blue-800 font-semibold">Puntos</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{results.accuracy}%</div>
                <p className="text-green-800 font-semibold">Precisión</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {results.correctAnswers}/{results.totalQuestions}
                </div>
                <p className="text-purple-800 font-semibold">Correctas</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.floor(results.timeSpent / 60)}:{(results.timeSpent % 60).toString().padStart(2, '0')}
                </div>
                <p className="text-orange-800 font-semibold">Tiempo</p>
              </div>
            </div>

            {/* Revisión de respuestas */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Revisión de Respuestas</h3>
              <div className="space-y-3">
                {answers.map((answer, index) => {
                  const question = selectedGame.questions![answer.questionIndex]
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        answer.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {answer.isCorrect ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">
                          {question.text}
                        </p>
                        <p className="text-xs text-gray-600">
                          {answer.selectedAnswer === -1 
                            ? 'Sin respuesta (tiempo agotado)'
                            : `Tu respuesta: ${shuffledQuestions[answer.questionIndex]?.shuffledOptions[answer.selectedAnswer] || 'N/A'}`
                          }
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-sm text-dominican-blue">
                          +{answer.pointsEarned}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(answer.timeToAnswer / 1000).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-4">
              <button
                onClick={handlePlayAgain}
                className="btn-dominican-primary flex-1"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Jugar de Nuevo
              </button>
              
              {!isQRSession && (
                <button
                  onClick={handleSelectNewGame}
                  className="btn-dominican-outline flex-1"
                >
                  Elegir Otro Juego
                </button>
              )}
              
              <button
                onClick={onBack}
                className="btn-dominican-outline flex-1"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando juego...</p>
      </div>
    </div>
  )
}

export default SinglePlayerGame