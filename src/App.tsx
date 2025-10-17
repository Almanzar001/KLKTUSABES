import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthScreen from './components/AuthScreen'
import WelcomeScreen from './components/WelcomeScreen'
import CreateRoom from './components/CreateRoom'
import JoinRoom from './components/JoinRoom'
import SinglePlayerGame from './components/SinglePlayerGame'
import QRGameAccess from './components/QRGameAccess'
import AdminPanel from './components/AdminPanel'
import { Room, Player } from './types'
import './index.css'

type AppView = 'welcome' | 'create-room' | 'join-room' | 'single-player' | 'qr-access' | 'admin' | 'game-room'

const AppContent: React.FC = () => {
  const { user, loading } = useAuth()
  const [currentView, setCurrentView] = useState<AppView>('welcome')
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dominican-blue to-dominican-red flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h2 className="text-white text-xl font-semibold">Cargando KLKTUSABES...</h2>
          <p className="text-blue-100 mt-2">Preparando la experiencia dominicana</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, mostrar pantalla de autenticación
  if (!user) {
    return <AuthScreen />
  }

  // Navegación entre vistas
  const handleNavigate = (view: AppView) => {
    setCurrentView(view)
  }

  const handleBackToWelcome = () => {
    setCurrentView('welcome')
    setCurrentRoom(null)
    setCurrentPlayer(null)
  }

  const handleJoinRoom = (room: Room, player: Player) => {
    setCurrentRoom(room)
    setCurrentPlayer(player)
    setCurrentView('game-room')
  }

  // Renderizar vista actual
  const renderCurrentView = () => {
    switch (currentView) {
      case 'welcome':
        return <WelcomeScreen onNavigate={handleNavigate} />
      
      case 'create-room':
        return (
          <CreateRoom 
            onBack={handleBackToWelcome}
            onJoinRoom={handleJoinRoom}
          />
        )
      
      case 'join-room':
        return (
          <JoinRoom 
            onBack={handleBackToWelcome}
            onJoinRoom={handleJoinRoom}
          />
        )
      
      case 'single-player':
        return (
          <SinglePlayerGame onBack={handleBackToWelcome} />
        )
      
      case 'qr-access':
        return (
          <QRGameAccess onBack={handleBackToWelcome} />
        )
      
      case 'admin':
        return (
          <AdminPanel onBack={handleBackToWelcome} />
        )

      case 'game-room':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Sala de Juego</h2>
              <p className="text-gray-600 mb-6">
                {currentRoom?.name} - Código: {currentRoom?.code}
              </p>
              <p className="text-gray-600 mb-6">
                Jugador: {currentPlayer?.name} {currentPlayer?.avatar}
              </p>
              <button onClick={handleBackToWelcome} className="btn-dominican-primary">
                Salir de la Sala
              </button>
            </div>
          </div>
        )
      
      default:
        return <WelcomeScreen onNavigate={handleNavigate} />
    }
  }

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App