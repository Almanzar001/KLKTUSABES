# 🇩🇴 KLKTUSABES - Trivia Dominicana Interactiva

Una aplicación de trivia interactiva inspirada en Kahoot!, desarrollada específicamente para la comunidad dominicana con colores patrios, multijugador en tiempo real y acceso por códigos QR.

![KLKTUSABES Logo](https://img.shields.io/badge/KLKTUSABES-Trivia%20Dominicana-blue?style=for-the-badge&logo=game&logoColor=white)

## 🌟 Características Principales

- **🎮 Modos de Juego Múltiples**: Salas multijugador, juego individual y acceso directo por QR
- **🇩🇴 Diseño Dominicano**: Colores patrios oficiales y tema cultural local
- **⚡ Tiempo Real**: Sincronización instantánea con Supabase Realtime
- **👥 Multijugador**: Hasta 20 jugadores por sala con avatares personalizados
- **🔊 Efectos de Sonido**: Sistema de audio inmersivo para mejor experiencia
- **📱 Responsive**: Funciona perfectamente en móviles, tablets y desktop
- **🔐 Autenticación Segura**: Login con Google OAuth
- **🎯 Sistema de Puntuación**: Puntos basados en velocidad y precisión
- **📊 Roles de Usuario**: Participantes y creadores con permisos diferenciados

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS con tema dominicano personalizado
- **Base de Datos**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime WebSockets
- **Autenticación**: Supabase Auth con Google OAuth
- **QR Codes**: Librería `qrcode`
- **Iconos**: Lucide React
- **Audio**: Web Audio API

## 🚀 Instalación Rápida

### Prerrequisitos

- Node.js 18 o superior
- npm o yarn
- Cuenta en [Supabase](https://supabase.com)
- Cuenta de Google (para OAuth)

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd klktusabes
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=tu_supabase_project_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 4. Configurar Supabase

1. Ve a [Supabase](https://supabase.com) y crea un nuevo proyecto
2. Ve a **Settings** → **API** y copia la Project URL y Project API Key
3. En **SQL Editor**, ejecuta el script completo:

```sql
-- Copia y pega todo el contenido de setup_complete_database.sql
```

### 5. Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita la **Google+ API**
4. Ve a **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configura las URLs de redirección:
   ```
   http://localhost:3000
   https://tu-proyecto.supabase.co/auth/v1/callback
   ```
6. En Supabase, ve a **Authentication** → **Providers**
7. Habilita **Google** y agrega tu Client ID y Client Secret

### 6. Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🎯 Uso de la Aplicación

### Para Jugadores (Participantes)

1. **Registro**: Haz clic en "Continuar con Google"
2. **Jugar**: Elige entre:
   - **Crear Sala**: Inicia una nueva partida multijugador
   - **Unirse a Sala**: Ingresa un código de 6 dígitos
   - **Juego Individual**: Practica con cualquier trivia
   - **Acceso QR**: Escanea un código QR para acceso directo

### Para Creadores

1. **Obtener Permisos**: Después del primer login, ejecuta en Supabase:
   ```sql
   UPDATE user_profiles SET role = 'creador' WHERE email = 'tu-email@gmail.com';
   ```

2. **Crear Contenido**:
   - **Panel Admin**: Accede desde el botón en la esquina superior
   - **Editor de Juegos**: Crea nuevas trivias con preguntas personalizadas
   - **Sesiones QR**: Genera códigos QR para acceso público

### Flujo de Juego Multijugador

1. **Host crea sala** → Genera código automático de 6 dígitos
2. **Jugadores se unen** → Ingresan código y seleccionan avatar
3. **Host selecciona juego** → Elige trivia de la biblioteca
4. **Partida comienza** → Todas las preguntas se sincronizan en tiempo real
5. **Puntuación dinámica** → Puntos basados en velocidad y precisión
6. **Resultados finales** → Clasificación y estadísticas

## 📋 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Construcción para producción
npm run build

# Vista previa de la construcción
npm run preview

# Linting
npm run lint

# Verificación de tipos
npm run type-check
```

## 🎨 Personalización

### Colores del Tema

Los colores dominicanos están definidos en `tailwind.config.js`:

```javascript
colors: {
  'dominican-blue': '#002D62',
  'dominican-red': '#CE1126',
  'dominican-white': '#FFFFFF'
}
```

### Avatares Disponibles

Los emojis disponibles están en `src/types.ts`:

```typescript
export const AVAILABLE_AVATARS = [
  '😀', '😃', '😄', '😁', '😊', '😎', '🤓', '🥸',
  // ... más emojis
]
```

## 🚀 Despliegue

### Opción 1: Vercel (Recomendado)

1. **Conectar repositorio**:
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Configurar variables de entorno**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. **Actualizar URLs de OAuth** en Google Cloud Console:
   ```
   https://tu-app.vercel.app
   ```

### Opción 2: Netlify

1. **Build del proyecto**:
   ```bash
   npm run build
   ```

2. **Deploy**:
   - Conecta tu repositorio de GitHub
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Variables de entorno: Agregar las mismas variables

## 📁 Estructura del Proyecto

```
klktusabes/
├── public/                     # Archivos estáticos
├── src/
│   ├── components/            # Componentes React
│   │   ├── AdminPanel.tsx     # Panel de administración
│   │   ├── AuthScreen.tsx     # Pantalla de login
│   │   ├── CreateRoom.tsx     # Crear sala multijugador
│   │   ├── GameEditor.tsx     # Editor de juegos
│   │   ├── GameSelector.tsx   # Selector de juegos
│   │   ├── JoinRoom.tsx       # Unirse a sala
│   │   ├── QRGameAccess.tsx   # Acceso por QR
│   │   ├── QRGameCreator.tsx  # Creador de sesiones QR
│   │   ├── QuestionEditor.tsx # Editor de preguntas
│   │   ├── SinglePlayerGame.tsx # Juego individual
│   │   └── WelcomeScreen.tsx  # Pantalla principal
│   ├── contexts/
│   │   └── AuthContext.tsx    # Contexto de autenticación
│   ├── hooks/
│   │   └── useGameSounds.ts   # Hook para efectos de sonido
│   ├── App.tsx                # Componente principal
│   ├── main.tsx              # Punto de entrada
│   ├── supabase.ts           # Configuración de Supabase
│   ├── types.ts              # Tipos TypeScript
│   └── index.css             # Estilos globales
├── setup_complete_database.sql # Script de configuración de BD
├── package.json              # Dependencias
├── tailwind.config.js        # Configuración de Tailwind
├── vite.config.ts           # Configuración de Vite
└── README.md                # Esta documentación
```

## 🎮 Características Técnicas

### Sistema de Puntuación

```typescript
const calculatePoints = (isCorrect: boolean, timeToAnswer: number): number => {
  if (!isCorrect) return 0
  return Math.round(1000 / (timeToAnswer / 1000 + 1))
}
```

- **Respuesta correcta rápida**: Hasta 1000 puntos
- **Respuesta correcta lenta**: Mínimo 50 puntos
- **Respuesta incorrecta**: 0 puntos

### Efectos de Sonido

El hook `useGameSounds` proporciona:

- `playCorrect()` - Melodía ascendente para respuestas correctas
- `playIncorrect()` - Sonido descendente para respuestas incorrectas
- `playTick()` - Tick de countdown
- `playTimeUp()` - Alerta de tiempo agotado
- `playGameStart()` - Inicio de juego
- `playGameEnd()` - Fin de juego

### Tiempo Real

Eventos monitoreados con Supabase Realtime:

- Cambios en jugadores de salas
- Actualizaciones de estado de salas
- Respuestas de jugadores en tiempo real
- Progreso de sesiones de juego

## 🔧 Solución de Problemas

### Error de Autenticación

Si el login con Google no funciona:

1. Verificar variables de entorno
2. Revisar configuración de OAuth en Google Cloud
3. Comprobar URLs de redirección
4. Ejecutar el script SQL completo

### Base de Datos No Sincroniza

Si los cambios no aparecen en tiempo real:

1. Verificar que RLS esté configurado
2. Revisar suscripciones de Realtime
3. Comprobar políticas de seguridad

### Sonidos No Funcionan

Si no hay audio durante el juego:

1. Verificar permisos del navegador
2. Interactuar primero con la página (click)
3. Revisar configuración de volumen

## 🤝 Contribución

1. Fork el repositorio
2. Crear rama de feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m "feat: agregar nueva funcionalidad"`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Estándares de Código

- TypeScript estricto
- Componentes funcionales con hooks
- Nombres descriptivos en español
- Comentarios en código complejo
- Seguir convenciones de Tailwind CSS

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

### Uso Comercial Permitido

- ✅ Uso comercial
- ✅ Modificación libre
- ✅ Distribución libre
- ✅ Uso privado

**Únicos requisitos**: Incluir aviso de copyright y licencia MIT.

## 🆘 Soporte

- **GitHub Issues**: [Reportar problemas](https://github.com/tu-usuario/klktusabes/issues)
- **Email**: tu-email@ejemplo.com
- **Documentación**: Este README

### Antes de Reportar un Problema

1. ✅ Verificar que seguiste todos los pasos de instalación
2. ✅ Revisar la sección de [Solución de Problemas](#-solución-de-problemas)
3. ✅ Buscar en issues existentes
4. ✅ Incluir información del entorno (OS, Node version, etc.)

## 🎉 Créditos

**Hecho con ❤️ para la comunidad dominicana** 🇩🇴

### Tecnologías Utilizadas

- [React](https://react.dev) - Biblioteca de UI
- [TypeScript](https://www.typescriptlang.org) - Tipado estático
- [Vite](https://vitejs.dev) - Build tool y dev server
- [Tailwind CSS](https://tailwindcss.com) - Framework de CSS
- [Supabase](https://supabase.com) - Backend como servicio
- [Lucide React](https://lucide.dev) - Iconos
- [QRCode](https://github.com/soldair/node-qrcode) - Generación de códigos QR

---

*Si este proyecto te fue útil, considera darle una ⭐ en GitHub y compartirlo con otros desarrolladores dominicanos.*

**¡Klk, tú sabe! 🇩🇴**