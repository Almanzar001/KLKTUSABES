# 🇩🇴 GUÍA COMPLETA PARA CLONAR KAHOOT RD (KLKTUSABES)

Una guía detallada paso a paso para clonar y configurar la aplicación de trivia interactiva KahootRD (KLKTUSABES) con todas sus características y funcionalidades.

## 📋 Índice

1. [Descripción General](#-descripción-general)
2. [Características Principales](#-características-principales)
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)
4. [Requisitos Previos](#-requisitos-previos)
5. [Instalación Paso a Paso](#-instalación-paso-a-paso)
6. [Configuración de la Base de Datos](#-configuración-de-la-base-de-datos)
7. [Configuración de Autenticación](#-configuración-de-autenticación)
8. [Estructura del Proyecto](#-estructura-del-proyecto)
9. [Funcionalidades Detalladas](#-funcionalidades-detalladas)
10. [Despliegue](#-despliegue)
11. [Solución de Problemas](#-solución-de-problemas)
12. [Personalización](#-personalización)

---

## 🎯 Descripción General

**KLKTUSABES** es una aplicación de trivia interactiva inspirada en Kahoot!, desarrollada específicamente para la comunidad dominicana con:

- **Colores patrios**: Diseño basado en la bandera dominicana
- **Multijugador en tiempo real**: Usando Supabase Realtime
- **Creación de contenido**: Editor de juegos y preguntas integrado
- **Acceso por QR**: Sesiones compartibles por código QR
- **Sistema de roles**: Participantes y creadores
- **Responsive**: Funciona en móviles, tablets y desktop

---

## 🌟 Características Principales

### 🎮 **Modos de Juego**
- ✅ **Salas Multijugador**: Crear y unirse con códigos únicos de 6 dígitos
- ✅ **Juego Individual**: Practicar con cualquier trivia disponible
- ✅ **Modo QR**: Crear sesiones accesibles escaneando códigos QR
- ✅ **Tiempo Real**: Actualizaciones instantáneas con Supabase Realtime

### 👥 **Sistema Social**
- ✅ **Avatares Personalizados**: Sistema de emojis como avatares
- ✅ **Clasificación en Vivo**: Leaderboard con ranking en tiempo real
- ✅ **Roles Diferenciados**: Host (anfitrión) y jugadores con permisos específicos
- ✅ **Autenticación**: Sistema completo con Google OAuth

### 🎨 **Diseño Dominicano**
- ✅ **Colores Patrios**: 
  - Azul Dominicano: `#002D62` (botones principales)
  - Rojo Dominicano: `#CE1126` (botones de acción)
  - Blanco: `#FFFFFF` (fondos y texto)
- ✅ **Responsive Design**: Adaptado para todos los dispositivos
- ✅ **Interfaz Moderna**: Diseño clean con Tailwind CSS

### 🛠️ **Herramientas de Creación**
- ✅ **Editor de Juegos**: Crear trivias personalizadas
- ✅ **Editor de Preguntas**: Interfaz intuitiva para agregar preguntas con:
  - Texto de la pregunta
  - 4 opciones de respuesta
  - Respuesta correcta
  - Tiempo límite personalizable
  - Soporte para imágenes
- ✅ **Gestión de Sesiones QR**: Control completo sobre sesiones QR
- ✅ **Panel de Administración**: Para usuarios creadores

### 🔊 **Efectos de Sonido**
- ✅ **Sonidos de Juego**: 
  - Respuesta correcta
  - Respuesta incorrecta
  - Tick de countdown
  - Tiempo agotado
  - Inicio y fin de juego

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Auth          │
│   React + TS    │◄──►│   PostgreSQL    │◄──►│   Google OAuth  │
│   Tailwind CSS  │    │   Realtime      │    │   Row Level Sec │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Stack Tecnológico**
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS con tema dominicano personalizado
- **Base de Datos**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime WebSockets
- **Autenticación**: Supabase Auth con Google OAuth
- **QR Codes**: Librería `qrcode`
- **Iconos**: Lucide React
- **Audio**: Web Audio API

---

## 📋 Requisitos Previos

### **Software Necesario**
- **Node.js** 18 o superior
- **npm** o **yarn**
- **Git**
- Cuenta en **[Supabase](https://supabase.com)**
- Cuenta de **Google** (para OAuth)

### **Conocimientos Recomendados**
- React y TypeScript básico
- Conceptos de base de datos relacionales
- Familiaridad con Git

---

## 🚀 Instalación Paso a Paso

### **Paso 1: Clonar el Repositorio**

```bash
git clone https://github.com/Almanzar001/KLKTUSABES.git
cd KLKTUSABES
```

### **Paso 2: Instalar Dependencias**

```bash
npm install
```

### **Paso 3: Crear Proyecto en Supabase**

1. Ve a [Supabase](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que se complete la configuración
4. Ve a **Settings** → **API** y copia:
   - Project URL
   - Project API Key (anon, public)

### **Paso 4: Configurar Variables de Entorno**

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_supabase_project_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

---

## 🗄️ Configuración de la Base de Datos

### **Paso 1: Ejecutar Scripts SQL**

En el **SQL Editor** de Supabase, ejecuta los siguientes archivos en orden:

#### **1. Configuración de Autenticación (`auth_setup.sql`)**
```sql
-- CONFIGURACIÓN DE AUTENTICACIÓN Y ROLES - KLKTUSABES

-- Tabla para perfiles extendidos de usuarios
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'participante' CHECK (role IN ('participante', 'creador')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'participante'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();
```

#### **2. Tablas Principales**
```sql
-- TABLAS PRINCIPALES DEL SISTEMA

-- Tabla de juegos/trivias
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user UUID REFERENCES auth.users(id)
);

-- Tabla de preguntas
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSON NOT NULL, -- Array de 4 opciones
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  time_limit INTEGER DEFAULT 30,
  order_number INTEGER NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de salas multijugador
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'show_results', 'finished')),
  max_players INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user UUID REFERENCES auth.users(id)
);

-- Tabla de jugadores en salas
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  avatar VARCHAR(10) NOT NULL,
  score INTEGER DEFAULT 0,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sesiones de juego
CREATE TABLE game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id),
  current_question INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de respuestas de jugadores
CREATE TABLE player_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  session_id UUID REFERENCES game_sessions(id),
  answer INTEGER NOT NULL,
  time_to_answer INTEGER NOT NULL, -- en milisegundos
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sesiones QR
CREATE TABLE qr_game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code VARCHAR(10) UNIQUE NOT NULL,
  game_id UUID REFERENCES games(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user UUID REFERENCES auth.users(id)
);
```

#### **3. Índices y Optimizaciones**
```sql
-- ÍNDICES PARA MEJOR RENDIMIENTO

CREATE INDEX idx_questions_game_id ON questions(game_id);
CREATE INDEX idx_questions_order ON questions(game_id, order_number);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_player_answers_session ON player_answers(session_id);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_qr_sessions_code ON qr_game_sessions(access_code);
```

### **Paso 2: Configurar Row Level Security (RLS)**

```sql
-- CONFIGURACIÓN DE SEGURIDAD

-- Habilitar RLS en todas las tablas
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_game_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Public can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public can read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Public can access rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "Public can access players" ON players FOR ALL USING (true);
CREATE POLICY "Public can access sessions" ON game_sessions FOR ALL USING (true);
CREATE POLICY "Public can access answers" ON player_answers FOR ALL USING (true);
CREATE POLICY "Public can read QR sessions" ON qr_game_sessions FOR SELECT USING (true);
```

---

## 🔐 Configuración de Autenticación

### **Paso 1: Configurar Google OAuth**

1. Ve a **Authentication** → **Providers** en Supabase
2. Habilita **Google**
3. Ve a [Google Cloud Console](https://console.cloud.google.com/)
4. Crea un nuevo proyecto o selecciona uno existente
5. Habilita la **Google+ API**
6. Ve a **Credentials** y crea un **OAuth 2.0 Client ID**
7. Configura las URLs de redirección:
   ```
   http://localhost:3000 (para desarrollo)
   https://tu-dominio.com (para producción)
   https://tu-proyecto.supabase.co/auth/v1/callback
   ```
8. Copia el **Client ID** y **Client Secret** en Supabase

### **Paso 2: Configurar Roles de Usuario**

Después del primer login, ejecuta en Supabase para hacer a alguien creador:

```sql
UPDATE user_profiles 
SET role = 'creador' 
WHERE email = 'tu-email@gmail.com';
```

---

## 📁 Estructura del Proyecto

```
kahootRD/
├── public/                     # Archivos estáticos
├── src/
│   ├── components/            # Componentes React
│   │   ├── AdminPanel.tsx     # Panel de administración
│   │   ├── AuthScreen.tsx     # Pantalla de login
│   │   ├── CreateRoom.tsx     # Crear sala multijugador
│   │   ├── GameEditor.tsx     # Editor de juegos
│   │   ├── GameRoom.tsx       # Sala de juego en tiempo real
│   │   ├── GameSelector.tsx   # Selector de juegos
│   │   ├── JoinRoom.tsx       # Unirse a sala
│   │   ├── Leaderboard.tsx    # Tabla de posiciones
│   │   ├── QRGameAccess.tsx   # Acceso por QR
│   │   ├── QRGameCreator.tsx  # Creador de sesiones QR
│   │   ├── QuestionEditor.tsx # Editor de preguntas
│   │   ├── SinglePlayerGame.tsx # Juego individual
│   │   └── WelcomeScreen.tsx  # Pantalla principal
│   ├── contexts/
│   │   └── AuthContext.tsx    # Contexto de autenticación
│   ├── hooks/
│   │   └── useGameSounds.ts   # Hook para sonidos
│   ├── App.tsx                # Componente principal
│   ├── main.tsx              # Punto de entrada
│   ├── supabase.ts           # Configuración de Supabase
│   ├── types.ts              # Tipos TypeScript
│   └── index.css             # Estilos globales
├── auth_setup.sql            # Script de configuración de BD
├── package.json              # Dependencias
├── tailwind.config.js        # Configuración de Tailwind
├── vite.config.ts           # Configuración de Vite
└── README.md                # Documentación
```

---

## ⚡ Funcionalidades Detalladas

### **1. Sistema de Autenticación**

**Archivos**: `AuthContext.tsx`, `AuthScreen.tsx`

**Características**:
- Login con Google OAuth
- Roles automáticos (participante/creador)
- Persistencia de sesión
- Protección de rutas

**Flujo**:
1. Usuario hace clic en "Iniciar con Google"
2. Supabase maneja la autenticación OAuth
3. Se crea automáticamente un perfil en `user_profiles`
4. El usuario es redirigido a la aplicación

### **2. Creación de Juegos**

**Archivos**: `GameEditor.tsx`, `QuestionEditor.tsx`

**Características**:
- Solo usuarios con rol "creador"
- Editor WYSIWYG para preguntas
- Soporte para imágenes
- Validación de formularios
- Límites de tiempo personalizables

**Flujo de Creación**:
1. Crear juego → Agregar título y descripción
2. Agregar preguntas → Texto, 4 opciones, respuesta correcta, tiempo
3. Previsualizar → Ver cómo se verá el juego
4. Publicar → Disponible para todos los usuarios

### **3. Salas Multijugador**

**Archivos**: `CreateRoom.tsx`, `JoinRoom.tsx`, `GameRoom.tsx`

**Características**:
- Códigos únicos de 6 dígitos
- Hasta 20 jugadores por sala
- Sincronización en tiempo real
- Host con controles especiales
- Sistema de avatares con emojis

**Flujo de Juego**:
1. **Host crea sala** → Genera código automático
2. **Jugadores se unen** → Ingresan código y avatar
3. **Host selecciona juego** → Elige trivia de la lista
4. **Inicio de partida** → Comienza temporizador
5. **Pregunta por pregunta** → Todos responden simultáneamente
6. **Resultados en tiempo real** → Puntuaciones actualizadas
7. **Clasificación final** → Ganadores y estadísticas

### **4. Sistema de Puntuación**

**Fórmula de Puntos**:
```javascript
const points = isCorrect ? Math.round(1000 / (timeToAnswer + 1)) : 0
```

- **Respuesta correcta**: 1000 puntos base dividido por tiempo de respuesta
- **Respuesta rápida**: Más puntos (máximo 1000)
- **Respuesta lenta**: Menos puntos (mínimo 50)
- **Respuesta incorrecta**: 0 puntos

### **5. Modo QR**

**Archivos**: `QRGameCreator.tsx`, `QRGameAccess.tsx`

**Características**:
- Códigos QR únicos de 10 caracteres
- URLs compartibles
- Acceso directo sin autenticación
- Solo creadores pueden generar

**URL Structure**:
```
https://tu-app.com/#/qr-game/ABC123DEF0
```

### **6. Efectos de Sonido**

**Archivo**: `useGameSounds.ts`

**Sonidos Incluidos**:
- ✅ `playCorrect()` - Respuesta correcta
- ❌ `playIncorrect()` - Respuesta incorrecta  
- ⏰ `playTick()` - Countdown final
- 🔔 `playTimeUp()` - Tiempo agotado
- 🎵 `playGameStart()` - Inicio de juego
- 🏁 `playGameEnd()` - Fin de juego

### **7. Tiempo Real con Supabase**

**Eventos Monitoreados**:
```javascript
// Cambios en jugadores
.on('postgres_changes', {
  event: '*',
  schema: 'public', 
  table: 'players'
})

// Cambios en sala
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'rooms'
})

// Respuestas de jugadores
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'player_answers'
})
```

---

## 🚀 Despliegue

### **Opción 1: Vercel (Recomendado)**

1. **Preparar para producción**:
```bash
npm run build
```

2. **Conectar con Vercel**:
```bash
npm install -g vercel
vercel
```

3. **Configurar variables de entorno en Vercel**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### **Opción 2: Netlify**

1. **Build del proyecto**:
```bash
npm run build
```

2. **Deploy en Netlify**:
   - Conecta tu repositorio de GitHub
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Variables de entorno: Agregar las mismas variables

### **Configuración de dominio personalizado**

1. **Actualizar URLs de redirect en Google OAuth**
2. **Configurar CORS en Supabase**:
   ```
   https://tu-dominio.com
   ```

---

## 🔧 Solución de Problemas

### **Problema: Error de autenticación**

**Síntomas**: "Auth state null" o login no funciona

**Solución**:
1. Verificar variables de entorno
2. Ejecutar `auth_setup.sql` completo
3. Verificar configuración de Google OAuth
4. Revisar URLs de redirect

### **Problema: Base de datos no sincroniza**

**Síntomas**: Cambios no aparecen en tiempo real

**Solución**:
1. Verificar que RLS esté configurado correctamente
2. Revisar políticas de seguridad
3. Comprobar suscripciones de Realtime

### **Problema: QR no funciona**

**Síntomas**: Código QR no redirige correctamente

**Solución**:
1. Verificar formato de URL: `#/qr-game/CODIGO`
2. Revisar tabla `qr_game_sessions`
3. Comprobar que el código sea único

### **Problema: Sonidos no se reproducen**

**Síntomas**: No hay audio durante el juego

**Solución**:
1. Verificar permisos del navegador
2. Interacción del usuario requerida (click primero)
3. Revisar `useGameSounds.ts`

---

## 🎨 Personalización

### **Cambiar Colores del Tema**

Editar `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Colores dominicanos
        'dominican-blue': '#002D62',
        'dominican-red': '#CE1126',
        // Tus colores personalizados
        'custom-primary': '#TU_COLOR',
        'custom-secondary': '#TU_COLOR'
      }
    }
  }
}
```

### **Cambiar Nombre de la App**

1. **package.json**: Cambiar `name` y `description`
2. **index.html**: Cambiar `<title>`
3. **WelcomeScreen.tsx**: Cambiar "KLKTUSABES"
4. **README.md**: Actualizar documentación

### **Agregar Nuevos Tipos de Pregunta**

1. **Modificar tipos en `types.ts`**:
```typescript
export interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false' | 'fill_blank' // Nuevo
  options: string[]
  correctAnswer: number | string // Modificado
  timeLimit: number
  image?: string
}
```

2. **Actualizar base de datos**:
```sql
ALTER TABLE questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'multiple_choice';
```

3. **Modificar componentes de pregunta**

### **Agregar Nuevos Efectos de Sonido**

En `useGameSounds.ts`:

```typescript
export const useGameSounds = () => {
  const playCustomSound = () => {
    const audio = new Audio('/path/to/custom-sound.mp3')
    audio.volume = 0.3
    audio.play().catch(console.error)
  }

  return {
    // ... otros sonidos
    playCustomSound
  }
}
```

---

## 📊 Métricas y Analytics

### **Métricas Básicas Incluidas**

- Número de jugadores por sala
- Tiempo de respuesta promedio
- Porcentaje de respuestas correctas
- Juegos más populares

### **Agregar Google Analytics**

1. **Instalar gtag**:
```bash
npm install gtag
```

2. **Configurar en `main.tsx`**:
```typescript
import { gtag } from 'gtag'

gtag('config', 'GA_MEASUREMENT_ID')
```

3. **Trackear eventos**:
```typescript
gtag('event', 'game_started', {
  event_category: 'engagement',
  event_label: 'multiplayer'
})
```

---

## 🔒 Seguridad

### **Medidas Implementadas**

- ✅ Row Level Security (RLS) en Supabase
- ✅ Validación de roles del lado del servidor
- ✅ Sanitización de inputs
- ✅ HTTPS obligatorio en producción
- ✅ Tokens JWT seguros

### **Recomendaciones Adicionales**

1. **Rate Limiting**: Implementar límites de solicitudes
2. **Validación de Entrada**: Validar todos los inputs del usuario
3. **Logs de Auditoria**: Registrar acciones importantes
4. **Backups**: Configurar backups automáticos en Supabase

---

## 📱 Progressive Web App (PWA)

### **Hacer la App Instalable**

1. **Crear `manifest.json`**:
```json
{
  "name": "KLKTUSABES",
  "short_name": "KLKTUSABES",
  "theme_color": "#002D62",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

2. **Registrar Service Worker**:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

---

## 🚀 Optimizaciones de Rendimiento

### **Implementadas**

- ✅ Code splitting con React.lazy
- ✅ Memoización de componentes
- ✅ Índices optimizados en base de datos
- ✅ Compresión de assets

### **Adicionales Recomendadas**

1. **Lazy Loading de Imágenes**
2. **Cacheo de Preguntas**
3. **Optimización de Bundle**
4. **CDN para Assets Estáticos**

---

## 🧪 Testing

### **Configurar Tests**

1. **Instalar dependencias**:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

2. **Configurar Vitest**:
```javascript
// vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
```

3. **Tests de ejemplo**:
```typescript
// src/components/__tests__/WelcomeScreen.test.tsx
import { render, screen } from '@testing-library/react'
import WelcomeScreen from '../WelcomeScreen'

test('renders welcome screen', () => {
  render(<WelcomeScreen {...props} />)
  expect(screen.getByText('KLKTUSABES')).toBeInTheDocument()
})
```

---

## 🤝 Contribución

### **Cómo Contribuir**

1. **Fork el repositorio**
2. **Crear rama de feature**:
```bash
git checkout -b feature/nueva-funcionalidad
```

3. **Hacer cambios y commit**:
```bash
git commit -m "feat: agregar nueva funcionalidad"
```

4. **Push y crear Pull Request**

### **Estándares de Código**

- TypeScript estricto
- Componentes funcionales con hooks
- Nombres descriptivos en español
- Comentarios en código complejo
- Tests para funcionalidades críticas

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT** - consulta el archivo [LICENSE](LICENSE) para más detalles.

### **Uso Comercial**

- ✅ Permitido uso comercial
- ✅ Modificación libre
- ✅ Distribución libre
- ✅ Uso privado

**Únicos requisitos**:
- Incluir aviso de copyright
- Incluir licencia MIT

---

## 📞 Soporte

### **Canales de Soporte**

- **GitHub Issues**: [Reportar problemas](https://github.com/Almanzar001/KLKTUSABES/issues)
- **Documentación**: Este archivo
- **Email**: almanzar001@github.com

### **Antes de Reportar un Problema**

1. ✅ Verificar que seguiste todos los pasos de instalación
2. ✅ Revisar la sección de [Solución de Problemas](#-solución-de-problemas)
3. ✅ Buscar en issues existentes
4. ✅ Incluir información del entorno (OS, Node version, etc.)

---

## 🎉 Conclusión

¡Felicidades! Ahora tienes una copia completa y funcional de KahootRD. 

### **Próximos Pasos Sugeridos**

1. 🎨 **Personalizar**: Cambiar colores y nombre según tu marca
2. 🚀 **Desplegar**: Subir a Vercel o Netlify
3. 📱 **Compartir**: Invitar usuarios a probar
4. 🔧 **Iterar**: Agregar nuevas funcionalidades según feedback
5. 🤝 **Contribuir**: Ayudar a mejorar el proyecto original

### **Recursos Adicionales**

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

**¡Hecho con ❤️ para la comunidad dominicana!** 🇩🇴

*Si este proyecto te fue útil, considera darle una ⭐ en GitHub y compartirlo con otros desarrolladores.*