import React, { useState, useEffect } from 'react'
import { QrCode, Search, Play, ArrowLeft } from 'lucide-react'
import { qrHelpers } from '../supabase'
import { QRGameSession, Game, isValidQRCode } from '../types'
import SinglePlayerGame from './SinglePlayerGame'

interface QRGameAccessProps {
  onBack: () => void
}

const QRGameAccess: React.FC<QRGameAccessProps> = ({ onBack }) => {
  // Estados principales
  const [accessCode, setAccessCode] = useState('')
  const [qrSession, setQRSession] = useState<QRGameSession | null>(null)
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  
  // Estados de la UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar si llegamos desde una URL con código QR
  useEffect(() => {
    const hash = window.location.hash
    const qrMatch = hash.match(/qr-game\/([A-Z0-9]+)/)
    
    if (qrMatch && qrMatch[1]) {
      const codeFromURL = qrMatch[1]
      setAccessCode(codeFromURL)
      handleAccessGame(codeFromURL)
    }
  }, [])

  const handleAccessGame = async (code?: string) => {
    const codeToUse = code || accessCode.trim().toUpperCase()
    
    if (!codeToUse) {
      setError('Por favor ingresa un código de acceso')
      return
    }

    if (!isValidQRCode(codeToUse)) {
      setError('El código debe tener 10 caracteres (letras y números)')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: qrError } = await qrHelpers.findQRSession(codeToUse)

      if (qrError) {
        if (qrError.code === 'PGRST116') {
          setError('No se encontró ninguna sesión con ese código')
        } else {
          setError('Error al buscar la sesión')
        }
        console.error('QR session error:', qrError)
        return
      }

      if (!data.is_active) {
        setError('Esta sesión QR ha sido desactivada')
        return
      }

      setQRSession(data)
      setCurrentGame(data.game)
    } catch (err) {
      setError('Error inesperado al acceder a la sesión')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartGame = () => {
    setGameStarted(true)
  }

  const handleGameEnd = () => {
    setGameStarted(false)
  }

  const handleCodeChange = (value: string) => {
    // Convertir a mayúsculas y filtrar solo letras y números
    const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    setAccessCode(cleanValue)
  }

  // Si el juego ha comenzado, mostrar el componente de juego
  if (gameStarted && currentGame) {
    return (
      <SinglePlayerGame
        game={currentGame}
        onBack={handleGameEnd}
        isQRSession={true}
        qrSessionTitle={qrSession?.title}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-dominican-blue hover:text-dominican-blue-light"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Acceso por QR</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {!qrSession ? (
          // Formulario de acceso
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Acceso por Código QR
              </h2>
              <p className="text-gray-600">
                Ingresa el código de acceso o escanea un código QR
              </p>
            </div>

            <div className="space-y-6">
              {/* Código de acceso */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código de Acceso *
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full p-4 text-center text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 tracking-widest"
                  placeholder="ABC123DEF0"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Código de 10 caracteres (letras y números)
                </p>
              </div>

              <button
                onClick={() => handleAccessGame()}
                disabled={!accessCode.trim() || accessCode.length !== 10 || loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Search className="w-5 h-5 mr-2 inline" />
                {loading ? 'Buscando...' : 'Acceder al Juego'}
              </button>
            </div>

            {/* Instrucciones */}
            <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">
                📱 ¿Cómo usar el acceso QR?
              </h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• <strong>Escanea</strong> el código QR con la cámara de tu teléfono</li>
                <li>• <strong>O ingresa</strong> manualmente el código de 10 caracteres</li>
                <li>• <strong>Accede</strong> directamente al juego sin crear salas</li>
                <li>• <strong>Juega</strong> de forma individual a tu ritmo</li>
              </ul>
            </div>

            {/* Cómo escanear QR */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                📸 ¿Cómo escanear un código QR?
              </h3>
              <div className="text-sm text-blue-700 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">iPhone:</span>
                  <span>Abre la cámara y apunta al QR. Toca la notificación que aparece.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">Android:</span>
                  <span>Abre Google Lens o la cámara (modo QR) y apunta al código.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Vista previa del juego encontrado
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ¡Sesión Encontrada!
              </h2>
              <p className="text-gray-600">
                Listo para comenzar el juego
              </p>
            </div>

            {/* Información del juego */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {qrSession.title}
              </h3>
              
              {qrSession.description && (
                <p className="text-gray-600 mb-4">
                  {qrSession.description}
                </p>
              )}

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-3 rounded">
                  <span className="font-semibold text-gray-800">Juego:</span>
                  <p className="text-gray-600">{currentGame?.title}</p>
                </div>
                
                <div className="bg-white p-3 rounded">
                  <span className="font-semibold text-gray-800">Preguntas:</span>
                  <p className="text-gray-600">{currentGame?.questions?.length || 0}</p>
                </div>
                
                <div className="bg-white p-3 rounded">
                  <span className="font-semibold text-gray-800">Duración estimada:</span>
                  <p className="text-gray-600">
                    ~{Math.ceil((currentGame?.questions?.reduce((acc, q) => acc + q.time_limit, 0) || 0) / 60)} minutos
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded">
                  <span className="font-semibold text-gray-800">Código:</span>
                  <p className="text-gray-600 font-mono">{qrSession.access_code}</p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4">
              <button
                onClick={handleStartGame}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                <Play className="w-5 h-5 mr-2 inline" />
                Comenzar Juego
              </button>
              
              <button
                onClick={() => {
                  setQRSession(null)
                  setCurrentGame(null)
                  setAccessCode('')
                  setError(null)
                  // Limpiar URL si es necesario
                  if (window.location.hash.includes('qr-game')) {
                    window.location.hash = ''
                  }
                }}
                className="btn-dominican-outline py-4 px-6"
              >
                Buscar Otro
              </button>
            </div>

            {/* Información adicional */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                💡 <strong>Modo Individual:</strong> Este es un juego de acceso directo. 
                Jugarás solo y podrás tomarte el tiempo que necesites para responder cada pregunta.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QRGameAccess