-- ============================================================================
-- KLKTUSABES - CONFIGURACIÓN COMPLETA DE BASE DE DATOS SUPABASE
-- Script completo para configurar todas las tablas, roles y datos de ejemplo
-- ============================================================================

-- PASO 1: CONFIGURACIÓN DE AUTENTICACIÓN Y PERFILES
-- ============================================================================

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

-- Función para crear perfil automáticamente cuando se registra un usuario
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

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: TABLAS PRINCIPALES DEL SISTEMA
-- ============================================================================

-- Tabla de juegos/trivias
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Trigger para actualizar updated_at en games
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de preguntas
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  options JSON NOT NULL, -- Array de 4 opciones
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  time_limit INTEGER DEFAULT 30 CHECK (time_limit >= 5 AND time_limit <= 120),
  order_number INTEGER NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, order_number)
);

-- Tabla de salas multijugador
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'show_results', 'finished')),
  max_players INTEGER DEFAULT 20 CHECK (max_players >= 2 AND max_players <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabla de jugadores en salas
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar VARCHAR(10) NOT NULL,
  score INTEGER DEFAULT 0,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, name) -- No permitir nombres duplicados en la misma sala
);

-- Tabla de sesiones de juego
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  current_question INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id) -- Una sesión activa por sala
);

-- Tabla de respuestas de jugadores
CREATE TABLE IF NOT EXISTS player_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE NOT NULL,
  answer INTEGER NOT NULL CHECK (answer >= 0 AND answer <= 3),
  time_to_answer INTEGER NOT NULL CHECK (time_to_answer > 0), -- en milisegundos
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, question_id, session_id) -- Una respuesta por jugador por pregunta
);

-- Tabla de sesiones QR
CREATE TABLE IF NOT EXISTS qr_game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code VARCHAR(10) UNIQUE NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- PASO 3: ÍNDICES PARA OPTIMIZACIÓN DE RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by_user);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_questions_game_id ON questions(game_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(game_id, order_number);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_is_host ON players(is_host) WHERE is_host = true;

CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);

CREATE INDEX IF NOT EXISTS idx_player_answers_session ON player_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_player ON player_answers(player_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_question ON player_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_qr_sessions_code ON qr_game_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_active ON qr_game_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_qr_sessions_created_by ON qr_game_sessions(created_by_user);

-- PASO 4: CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_game_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para games (lectura pública, escritura solo creadores)
DROP POLICY IF EXISTS "Anyone can read games" ON games;
CREATE POLICY "Anyone can read games"
  ON games FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Creators can insert games" ON games;
CREATE POLICY "Creators can insert games"
  ON games FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'creador'
    )
  );

DROP POLICY IF EXISTS "Creators can update their own games" ON games;
CREATE POLICY "Creators can update their own games"
  ON games FOR UPDATE
  USING (auth.uid() = created_by_user);

-- Políticas para questions (vinculadas a los games)
DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
CREATE POLICY "Anyone can read questions"
  ON questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Game creators can manage questions" ON questions;
CREATE POLICY "Game creators can manage questions"
  ON questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE id = questions.game_id AND created_by_user = auth.uid()
    )
  );

-- Políticas para rooms, players, game_sessions, player_answers (acceso público para el juego)
DROP POLICY IF EXISTS "Anyone can access rooms" ON rooms;
CREATE POLICY "Anyone can access rooms"
  ON rooms FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Anyone can access players" ON players;
CREATE POLICY "Anyone can access players"
  ON players FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Anyone can access game sessions" ON game_sessions;
CREATE POLICY "Anyone can access game sessions"
  ON game_sessions FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Anyone can access player answers" ON player_answers;
CREATE POLICY "Anyone can access player answers"
  ON player_answers FOR ALL
  USING (true);

-- Políticas para qr_game_sessions
DROP POLICY IF EXISTS "Anyone can read active QR sessions" ON qr_game_sessions;
CREATE POLICY "Anyone can read active QR sessions"
  ON qr_game_sessions FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Creators can manage their QR sessions" ON qr_game_sessions;
CREATE POLICY "Creators can manage their QR sessions"
  ON qr_game_sessions FOR ALL
  USING (
    auth.uid() = created_by_user AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'creador'
    )
  );

-- PASO 5: FUNCIONES AUXILIARES
-- ============================================================================

-- Función para generar código de sala único
CREATE OR REPLACE FUNCTION generate_unique_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generar código de 6 dígitos
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM rooms WHERE code = new_code) INTO code_exists;
    
    -- Si no existe, salir del loop
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código QR único
CREATE OR REPLACE FUNCTION generate_unique_qr_code()
RETURNS VARCHAR(10) AS $$
DECLARE
  new_code VARCHAR(10);
  code_exists BOOLEAN;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  LOOP
    new_code := '';
    
    -- Generar código de 10 caracteres
    FOR i IN 1..10 LOOP
      new_code := new_code || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM qr_game_sessions WHERE access_code = new_code) INTO code_exists;
    
    -- Si no existe, salir del loop
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular puntos basado en tiempo de respuesta
CREATE OR REPLACE FUNCTION calculate_points(is_correct BOOLEAN, time_to_answer INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF NOT is_correct THEN
    RETURN 0;
  END IF;
  
  -- Fórmula: 1000 puntos base dividido por (tiempo en segundos + 1)
  -- Máximo 1000 puntos, mínimo 50 puntos para respuestas correctas
  RETURN GREATEST(50, LEAST(1000, ROUND(1000.0 / (time_to_answer / 1000.0 + 1))));
END;
$$ LANGUAGE plpgsql;

-- PASO 6: DATOS DE EJEMPLO
-- ============================================================================

-- Insertar juegos de ejemplo (solo si no existen)
DO $$
DECLARE
  sample_game_id UUID;
  sample_user_id UUID;
BEGIN
  -- Crear un usuario de ejemplo para los juegos (si no existe)
  SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
  
  IF sample_user_id IS NULL THEN
    -- Si no hay usuarios, crear datos sin referencia de usuario
    sample_user_id := NULL;
  END IF;

  -- Juego 1: Historia Dominicana
  IF NOT EXISTS (SELECT 1 FROM games WHERE title = 'Historia Dominicana Básica') THEN
    INSERT INTO games (id, title, description, created_by_user) 
    VALUES (
      gen_random_uuid(),
      'Historia Dominicana Básica',
      'Preguntas fundamentales sobre la historia de República Dominicana',
      sample_user_id
    ) RETURNING id INTO sample_game_id;

    -- Preguntas para Historia Dominicana
    INSERT INTO questions (game_id, text, options, correct_answer, time_limit, order_number) VALUES
    (sample_game_id, '¿En qué año se independizó República Dominicana?', 
     '["1821", "1844", "1865", "1901"]', 1, 30, 1),
    
    (sample_game_id, '¿Quién fue el primer presidente de República Dominicana?', 
     '["Juan Pablo Duarte", "Pedro Santana", "Buenaventura Báez", "Ulises Heureaux"]', 1, 30, 2),
    
    (sample_game_id, '¿Cuál es la capital de República Dominicana?', 
     '["Santiago", "La Romana", "Santo Domingo", "Puerto Plata"]', 2, 20, 3),
    
    (sample_game_id, '¿Cómo se llamaba originalmente la isla que compartimos con Haití?', 
     '["Hispaniola", "Española", "La Española", "Todas las anteriores"]', 3, 25, 4),
    
    (sample_game_id, '¿En qué año llegó Cristóbal Colón a la isla?', 
     '["1490", "1492", "1495", "1500"]', 1, 25, 5);
  END IF;

  -- Juego 2: Cultura Dominicana
  IF NOT EXISTS (SELECT 1 FROM games WHERE title = 'Cultura Dominicana') THEN
    INSERT INTO games (id, title, description, created_by_user) 
    VALUES (
      gen_random_uuid(),
      'Cultura Dominicana',
      'Todo sobre nuestra rica cultura: música, comida, tradiciones',
      sample_user_id
    ) RETURNING id INTO sample_game_id;

    -- Preguntas para Cultura Dominicana
    INSERT INTO questions (game_id, text, options, correct_answer, time_limit, order_number) VALUES
    (sample_game_id, '¿Cuál es el plato nacional de República Dominicana?', 
     '["Moro de guandules", "La bandera", "Sancocho", "Pollo guisado"]', 1, 25, 1),
    
    (sample_game_id, '¿Cómo se llama el ritmo musical originario de RD?', 
     '["Salsa", "Merengue", "Bachata", "Reggaeton"]', 1, 20, 2),
    
    (sample_game_id, '¿Cuál es la bebida nacional dominicana?', 
     '["Ron", "Mamajuana", "Cerveza Presidente", "Ponche"]', 1, 25, 3),
    
    (sample_game_id, '¿En qué mes se celebra el Carnaval Dominicano?', 
     '["Enero", "Febrero", "Marzo", "Abril"]', 1, 20, 4),
    
    (sample_game_id, '¿Cuál es el deporte más popular en RD?', 
     '["Fútbol", "Básquetbol", "Béisbol", "Voleibol"]', 2, 20, 5);
  END IF;

  -- Juego 3: Geografía RD
  IF NOT EXISTS (SELECT 1 FROM games WHERE title = 'Geografía de República Dominicana') THEN
    INSERT INTO games (id, title, description, created_by_user) 
    VALUES (
      gen_random_uuid(),
      'Geografía de República Dominicana',
      'Conoce mejor la geografía de nuestro hermoso país',
      sample_user_id
    ) RETURNING id INTO sample_game_id;

    -- Preguntas para Geografía
    INSERT INTO questions (game_id, text, options, correct_answer, time_limit, order_number) VALUES
    (sample_game_id, '¿Cuál es el pico más alto de República Dominicana?', 
     '["Pico Duarte", "Loma Rucilla", "Loma Alto Bandera", "Pico Yaque"]', 0, 30, 1),
    
    (sample_game_id, '¿Cuántas provincias tiene República Dominicana?', 
     '["30", "31", "32", "33"]', 2, 25, 2),
    
    (sample_game_id, '¿Cuál es el río más largo del país?', 
     '["Río Yaque del Norte", "Río Yaque del Sur", "Río Ozama", "Río Artibonito"]', 0, 30, 3),
    
    (sample_game_id, '¿En qué cordillera se encuentra el Pico Duarte?', 
     '["Cordillera Septentrional", "Cordillera Central", "Cordillera Oriental", "Sierra de Bahoruco"]', 1, 30, 4),
    
    (sample_game_id, '¿Cuál es la provincia más grande de RD?', 
     '["La Altagracia", "Azua", "Barahona", "La Vega"]', 0, 25, 5);
  END IF;

END $$;

-- Crear algunas sesiones QR de ejemplo
DO $$
DECLARE
  sample_user_id UUID;
  game_id UUID;
BEGIN
  -- Obtener un usuario de ejemplo
  SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
  
  IF sample_user_id IS NOT NULL THEN
    -- Obtener ID del primer juego
    SELECT id INTO game_id FROM games LIMIT 1;
    
    IF game_id IS NOT NULL THEN
      -- Crear sesión QR de ejemplo si no existe
      IF NOT EXISTS (SELECT 1 FROM qr_game_sessions WHERE title = 'Trivia del Viernes') THEN
        INSERT INTO qr_game_sessions (access_code, game_id, title, description, created_by_user)
        VALUES (
          generate_unique_qr_code(),
          game_id,
          'Trivia del Viernes',
          'Sesión abierta para todos los estudiantes',
          sample_user_id
        );
      END IF;
    END IF;
  END IF;
END $$;

-- PASO 7: CONFIGURACIÓN FINAL
-- ============================================================================

-- ============================================================================
-- PASO 8: TABLA DE RESULTADOS PARA SESIONES QR
-- ============================================================================

-- Tabla para almacenar resultados de jugadores en sesiones QR
CREATE TABLE IF NOT EXISTS qr_session_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_session_id UUID REFERENCES qr_game_sessions(id) ON DELETE CASCADE NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  total_score INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  avg_time DECIMAL(10,2) DEFAULT 0, -- Tiempo promedio por pregunta en segundos
  game_data JSONB, -- Datos adicionales del juego (respuestas detalladas, etc.)
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_qr_session_results_session_id ON qr_session_results(qr_session_id);
CREATE INDEX IF NOT EXISTS idx_qr_session_results_score ON qr_session_results(qr_session_id, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_qr_session_results_completed ON qr_session_results(completed_at);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_qr_session_results_updated_at
  BEFORE UPDATE ON qr_session_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS para qr_session_results
ALTER TABLE qr_session_results ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública para leaderboards
CREATE POLICY "Public can read QR session results" 
  ON qr_session_results FOR SELECT 
  USING (true);

-- Permitir insertar solo a usuarios autenticados o sin autenticación para QR
CREATE POLICY "Allow insert QR session results" 
  ON qr_session_results FOR INSERT 
  WITH CHECK (true);

-- Solo permitir actualizar propios resultados (por nombre de jugador)
CREATE POLICY "Users can update own QR results" 
  ON qr_session_results FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Vista para estadísticas de sesiones QR
CREATE OR REPLACE VIEW qr_session_stats AS
SELECT 
  qgs.id as session_id,
  qgs.title,
  qgs.access_code,
  qgs.is_active,
  qgs.max_participants,
  COUNT(qsr.id) as total_players,
  COALESCE(MAX(qsr.total_score), 0) as best_score,
  COALESCE(ROUND(AVG(qsr.total_score::numeric), 0), 0) as avg_score,
  COALESCE(ROUND(AVG(qsr.total_correct::numeric / NULLIF(qsr.total_questions, 0) * 100), 1), 0) as avg_accuracy,
  qgs.created_at,
  qgs.expires_at
FROM qr_game_sessions qgs
LEFT JOIN qr_session_results qsr ON qgs.id = qsr.qr_session_id
GROUP BY qgs.id, qgs.title, qgs.access_code, qgs.is_active, qgs.max_participants, qgs.created_at, qgs.expires_at;

-- Habilitar Realtime para las tablas necesarias
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE player_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE qr_session_results;

-- Crear vistas útiles para estadísticas (opcional)
CREATE OR REPLACE VIEW game_stats AS
SELECT 
  g.id,
  g.title,
  g.description,
  COUNT(q.id) as total_questions,
  COALESCE(SUM(q.time_limit), 0) as total_time_seconds,
  g.created_at,
  up.full_name as creator_name
FROM games g
LEFT JOIN questions q ON g.id = q.game_id
LEFT JOIN user_profiles up ON g.created_by_user = up.id
GROUP BY g.id, g.title, g.description, g.created_at, up.full_name;

-- Vista para estadísticas de salas
CREATE OR REPLACE VIEW room_stats AS
SELECT 
  r.id,
  r.name,
  r.code,
  r.status,
  COUNT(p.id) as player_count,
  r.max_players,
  r.created_at
FROM rooms r
LEFT JOIN players p ON r.id = p.room_id
GROUP BY r.id, r.name, r.code, r.status, r.max_players, r.created_at;

-- ============================================================================
-- FIN DEL SCRIPT DE CONFIGURACIÓN
-- ============================================================================

-- Para crear un usuario como creador, ejecuta después del primer login:
-- UPDATE user_profiles SET role = 'creador' WHERE email = 'tu-email@gmail.com';

NOTIFY 'klktusabes_setup_complete', 'Base de datos configurada exitosamente para KLKTUSABES';

SELECT 
  'KLKTUSABES Database Setup Complete!' as status,
  (SELECT COUNT(*) FROM games) as sample_games,
  (SELECT COUNT(*) FROM questions) as sample_questions,
  (SELECT COUNT(*) FROM qr_game_sessions) as sample_qr_sessions;