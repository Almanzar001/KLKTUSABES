import { useCallback, useRef } from 'react'

// Tipos de sonidos disponibles
export type SoundType = 'correct' | 'incorrect' | 'tick' | 'timeup' | 'game-start' | 'game-end'

// Interface para el hook
interface UseGameSoundsReturn {
  playCorrect: () => void
  playIncorrect: () => void
  playTick: () => void
  playTimeUp: () => void
  playGameStart: () => void
  playGameEnd: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  isMuted: boolean
}

// Configuración de frecuencias para cada sonido (usando Web Audio API)
const SOUND_CONFIGS = {
  correct: {
    frequency: 523, // Do (C5)
    duration: 200,
    type: 'sine' as OscillatorType,
    volume: 0.3
  },
  incorrect: {
    frequency: 220, // La (A3)
    duration: 300,
    type: 'sawtooth' as OscillatorType,
    volume: 0.2
  },
  tick: {
    frequency: 800,
    duration: 100,
    type: 'square' as OscillatorType,
    volume: 0.1
  },
  timeup: {
    frequency: 150,
    duration: 500,
    type: 'triangle' as OscillatorType,
    volume: 0.25
  },
  'game-start': {
    frequency: 440, // La (A4)
    duration: 400,
    type: 'sine' as OscillatorType,
    volume: 0.3
  },
  'game-end': {
    frequency: 330, // Mi (E4)
    duration: 600,
    type: 'sine' as OscillatorType,
    volume: 0.3
  }
}

export const useGameSounds = (): UseGameSoundsReturn => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const volumeRef = useRef<number>(0.5)
  const isMutedRef = useRef<boolean>(false)

  // Inicializar AudioContext
  const getAudioContext = useCallback((): AudioContext | null => {
    if (!audioContextRef.current) {
      try {
        // Crear AudioContext solo si el navegador lo soporta
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass()
        }
      } catch (error) {
        console.warn('Web Audio API no está disponible:', error)
        return null
      }
    }
    return audioContextRef.current
  }, [])

  // Función para generar y reproducir un sonido
  const playSound = useCallback((soundType: SoundType) => {
    if (isMutedRef.current) return

    const audioContext = getAudioContext()
    if (!audioContext) return

    try {
      // Reanudar el contexto si está suspendido (requerido por algunos navegadores)
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }

      const config = SOUND_CONFIGS[soundType]
      
      // Crear oscilador
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      // Configurar oscilador
      oscillator.type = config.type
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime)
      
      // Configurar volumen
      const finalVolume = config.volume * volumeRef.current
      gainNode.gain.setValueAtTime(finalVolume, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration / 1000)
      
      // Conectar nodos
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Reproducir
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + config.duration / 1000)
      
      // Limpiar después de reproducir
      oscillator.onended = () => {
        oscillator.disconnect()
        gainNode.disconnect()
      }
    } catch (error) {
      console.warn(`Error reproduciendo sonido ${soundType}:`, error)
    }
  }, [getAudioContext])

  // Función especial para sonido de respuesta correcta con melodía
  const playCorrect = useCallback(() => {
    if (isMutedRef.current) return

    const audioContext = getAudioContext()
    if (!audioContext) return

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }

      // Melodía ascendente para respuesta correcta: Do - Mi - Sol
      const notes = [523, 659, 784] // C5, E5, G5
      const noteDuration = 150

      notes.forEach((frequency, index) => {
        const startTime = audioContext.currentTime + (index * noteDuration / 1000)
        
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, startTime)
        
        const finalVolume = 0.2 * volumeRef.current
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(finalVolume, startTime + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration / 1000)
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + noteDuration / 1000)
        
        oscillator.onended = () => {
          oscillator.disconnect()
          gainNode.disconnect()
        }
      })
    } catch (error) {
      console.warn('Error reproduciendo sonido de respuesta correcta:', error)
    }
  }, [getAudioContext])

  // Función especial para sonido de respuesta incorrecta
  const playIncorrect = useCallback(() => {
    if (isMutedRef.current) return

    const audioContext = getAudioContext()
    if (!audioContext) return

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }

      // Sonido descendente para respuesta incorrecta
      const startFreq = 400
      const endFreq = 200
      const duration = 0.4

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + duration)
      
      const finalVolume = 0.15 * volumeRef.current
      gainNode.gain.setValueAtTime(finalVolume, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
      
      oscillator.onended = () => {
        oscillator.disconnect()
        gainNode.disconnect()
      }
    } catch (error) {
      console.warn('Error reproduciendo sonido de respuesta incorrecta:', error)
    }
  }, [getAudioContext])

  // Otros sonidos usando la función genérica
  const playTick = useCallback(() => playSound('tick'), [playSound])
  const playTimeUp = useCallback(() => playSound('timeup'), [playSound])
  const playGameStart = useCallback(() => playSound('game-start'), [playSound])
  const playGameEnd = useCallback(() => playSound('game-end'), [playSound])

  // Control de volumen
  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume))
  }, [])

  // Toggle mute
  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current
    return isMutedRef.current
  }, [])

  return {
    playCorrect,
    playIncorrect,
    playTick,
    playTimeUp,
    playGameStart,
    playGameEnd,
    setVolume,
    toggleMute,
    isMuted: isMutedRef.current
  }
}

// Hook alternativo usando archivos de audio (si prefieres usar archivos MP3/WAV)
export const useGameSoundsWithFiles = (): UseGameSoundsReturn => {
  const audioRefs = useRef<{ [key in SoundType]?: HTMLAudioElement }>({})
  const volumeRef = useRef<number>(0.5)
  const isMutedRef = useRef<boolean>(false)

  // URLs de archivos de sonido (coloca los archivos en public/sounds/)
  const soundFiles: { [key in SoundType]: string } = {
    correct: '/sounds/correct.mp3',
    incorrect: '/sounds/incorrect.mp3',
    tick: '/sounds/tick.mp3',
    timeup: '/sounds/timeup.mp3',
    'game-start': '/sounds/game-start.mp3',
    'game-end': '/sounds/game-end.mp3'
  }

  // Precargar archivos de audio
  const preloadSound = useCallback((soundType: SoundType) => {
    if (!audioRefs.current[soundType]) {
      const audio = new Audio(soundFiles[soundType])
      audio.volume = volumeRef.current
      audio.preload = 'auto'
      audioRefs.current[soundType] = audio
    }
  }, [soundFiles])

  // Función para reproducir sonido desde archivo
  const playFileSound = useCallback((soundType: SoundType) => {
    if (isMutedRef.current) return

    try {
      preloadSound(soundType)
      const audio = audioRefs.current[soundType]
      
      if (audio) {
        audio.currentTime = 0
        audio.volume = volumeRef.current
        audio.play().catch(error => {
          console.warn(`Error reproduciendo ${soundType}:`, error)
        })
      }
    } catch (error) {
      console.warn(`Error con archivo de sonido ${soundType}:`, error)
    }
  }, [preloadSound])

  const playCorrect = useCallback(() => playFileSound('correct'), [playFileSound])
  const playIncorrect = useCallback(() => playFileSound('incorrect'), [playFileSound])
  const playTick = useCallback(() => playFileSound('tick'), [playFileSound])
  const playTimeUp = useCallback(() => playFileSound('timeup'), [playFileSound])
  const playGameStart = useCallback(() => playFileSound('game-start'), [playFileSound])
  const playGameEnd = useCallback(() => playFileSound('game-end'), [playFileSound])

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume))
    
    // Actualizar volumen de todos los audios cargados
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.volume = volumeRef.current
      }
    })
  }, [])

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current
    return isMutedRef.current
  }, [])

  return {
    playCorrect,
    playIncorrect,
    playTick,
    playTimeUp,
    playGameStart,
    playGameEnd,
    setVolume,
    toggleMute,
    isMuted: isMutedRef.current
  }
}

export default useGameSounds