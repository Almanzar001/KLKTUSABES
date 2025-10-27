import { useCallback, useRef, useState } from 'react'

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
  initializeAudio: () => Promise<boolean>
  isAudioEnabled: boolean
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
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gameSound_muted')
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })
  const activeOscillators = useRef<Set<OscillatorNode>>(new Set())
  const lastSoundTime = useRef<{ [key: string]: number }>({})
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)

  // Inicializar AudioContext de manera segura
  const getAudioContext = useCallback((): AudioContext | null => {
    if (!audioContextRef.current) {
      try {
        // Verificar soporte completo de Web Audio API
        if (!window.AudioContext && !(window as any).webkitAudioContext) {
          console.warn('Web Audio API no soportada en este navegador')
          return null
        }
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContextClass()
        
        // Intentar reanudar inmediatamente si está suspendido
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(err => {
            console.warn('No se pudo reanudar AudioContext automáticamente:', err)
          })
        }
        
        setIsAudioEnabled(true)
      } catch (error) {
        console.warn('Error creando AudioContext:', error)
        return null
      }
    }
    return audioContextRef.current
  }, [])

  // Función para inicializar audio manualmente (requerido por navegadores)
  const initializeAudio = useCallback(async (): Promise<boolean> => {
    const audioContext = getAudioContext()
    if (!audioContext) return false
    
    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      
      // Test básico de funcionalidad con sonido muy breve
      const testOscillator = audioContext.createOscillator()
      const testGain = audioContext.createGain()
      testGain.gain.setValueAtTime(0.001, audioContext.currentTime) // Volumen muy bajo para test
      testOscillator.connect(testGain)
      testGain.connect(audioContext.destination)
      testOscillator.frequency.setValueAtTime(440, audioContext.currentTime)
      testOscillator.start()
      testOscillator.stop(audioContext.currentTime + 0.001) // 1ms de duración
      
      setIsAudioEnabled(true)
      return true
    } catch (error) {
      console.warn('Error inicializando audio:', error)
      setIsAudioEnabled(false)
      return false
    }
  }, [getAudioContext])

  // Función para limpiar oscillators
  const cleanupOscillator = useCallback((oscillator: OscillatorNode, gainNode: GainNode) => {
    activeOscillators.current.delete(oscillator)
    try {
      oscillator.disconnect()
      gainNode.disconnect()
    } catch (e) {
      // Ya estaba desconectado, ignorar
    }
  }, [])

  // Función para generar y reproducir un sonido con debouncing
  const playSound = useCallback(async (soundType: SoundType, minInterval = 200) => {
    if (isMuted) return
    
    // Debouncing para evitar spam de sonidos
    const now = Date.now()
    const lastTime = lastSoundTime.current[soundType] || 0
    if (now - lastTime < minInterval) {
      return
    }
    lastSoundTime.current[soundType] = now
    
    // Límite de oscillators concurrentes para evitar sobrecarga
    if (activeOscillators.current.size >= 3) {
      console.warn('Demasiados sonidos concurrentes, omitiendo:', soundType)
      return
    }

    const audioContext = getAudioContext()
    if (!audioContext) return

    try {
      // Reanudar el contexto si está suspendido (requerido por algunos navegadores)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const config = SOUND_CONFIGS[soundType]
      
      // Crear oscilador
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      // Agregar a conjunto activo
      activeOscillators.current.add(oscillator)
      
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
        cleanupOscillator(oscillator, gainNode)
      }
      
      // Limpiar automáticamente después del tiempo configurado (fallback)
      setTimeout(() => {
        cleanupOscillator(oscillator, gainNode)
      }, config.duration + 100)
      
    } catch (error) {
      console.warn(`Error reproduciendo sonido ${soundType}:`, error)
    }
  }, [getAudioContext, isMuted, cleanupOscillator])

  // Función especial para sonido de respuesta correcta con melodía
  const playCorrect = useCallback(() => {
    if (isMuted) return

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
    if (isMuted) return

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

  // Otros sonidos usando la función genérica con debouncing apropiado
  const playTick = useCallback(() => { playSound('tick', 800) }, [playSound]) // Debounce más largo para tick
  const playTimeUp = useCallback(() => { playSound('timeup', 1000) }, [playSound])
  const playGameStart = useCallback(() => { playSound('game-start', 1000) }, [playSound])
  const playGameEnd = useCallback(() => { playSound('game-end', 1000) }, [playSound])

  // Control de volumen
  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume))
  }, [])

  // Toggle mute con persistencia
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev
      try {
        localStorage.setItem('gameSound_muted', JSON.stringify(newValue))
      } catch (e) {
        console.warn('No se pudo guardar preferencia de audio:', e)
      }
      return newValue
    })
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
    isMuted,
    initializeAudio,
    isAudioEnabled
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