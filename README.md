# 🪢 Cuellito

> El juego del ahorcado para dos personas. Adivina la palabra, reta a alguien especial.

**[▶ Jugar ahora → cuellito.vercel.app](https://cuellito.vercel.app)**

---

## ¿Qué es Cuellito?

Cuellito es una versión multijugador en tiempo real del clásico juego del ahorcado. Dos jugadores se enfrentan en cada partida: uno **propone** una palabra o frase, y el otro intenta **adivinarla** letra por letra a través de un chat.

Lo que lo hace diferente:
- **Chat en vivo** — el desafiado pide letras por chat y el proponente las confirma en el teclado
- **Comodines** — poderes especiales que cambian el curso de la partida
- **Modos de juego** — desde partidas rápidas hasta competitivo con timer
- **Estadísticas** — historial, rachas, tiempo promedio y más
- **100% gratis** — sin publicidad, sin límites

---

## Capturas de pantalla

### Landing
```
┌─────────────────────────────────────┐
│              🪢 Cuellito             │
│                                     │
│   El juego del ahorcado para dos    │
│   personas que se quieren.          │
│                                     │
│  ⚡ Tiempo real   📊 Estadísticas   │
│  🎭 Comodines     💑 Frases privadas│
│  🏆 Puntajes      📱 En el celular  │
│                                     │
│  [Empezar gratis]  [Iniciar sesión] │
└─────────────────────────────────────┘
```

### Inicio (Home)
```
┌─────────────────────────────────────┐
│  🪢 Cuellito          [qa_player]   │
├─────────────────────────────────────┤
│  Hola, Jugador 👋                   │
│  ¿Listo para jugar?                 │
│                                     │
│  ┌──────────────┐ ┌──────────────┐  │
│  │  🎮           │ │  🚪           │  │
│  │  Crear sala   │ │  Unirme      │  │
│  │  Genera un    │ │  Ingresa un  │  │
│  │  código y     │ │  código de   │  │
│  │  compártelo   │ │  6 letras    │  │
│  └──────────────┘ └──────────────┘  │
│                                     │
│  Mis estadísticas                   │
│  [12] Partidas  [75%] Victoria      │
│  [5🔥] Racha    [8⭐] Mejor racha   │
└─────────────────────────────────────┘
```

### Sala de espera (Lobby)
```
┌─────────────────────────────────────┐
│  Sala de espera                     │
│  Modo: Duelo · 4 rondas            │
│                                     │
│         Código de sala              │
│       ┌─────────────────┐           │
│       │   A B C D E F   │ [copiar]  │
│       └─────────────────┘           │
│    Comparte este código con tu      │
│    compañero/a                      │
│                                     │
│  🟢 jugador_a  (Anfitrión) (tú)    │
│  🟢 jugador_b  (Invitado)          │
│                                     │
│       [Iniciar partida →]           │
└─────────────────────────────────────┘
```

### Tablero de juego — Vista del proponente
```
┌─────────────────────────────────────┐
│  jugador_a 12  Ronda 1/4  jugador_b │
├─────────────┬───────────────────────┤
│  🎯 Tablero │  💬 Chat              │
│             │                       │
│  🐾 Animales│  ┌─────────────────┐  │
│  💡 Pista   │  │ jugador_b:      │  │
│  🎯 Tú prop.│  │ "¿Tiene la G?"  │  │
│             │  │                 │  │
│  ████       │  │ ✅ La G está    │  │
│  ██ █       │  │ en la palabra   │  │
│  █████      │  └─────────────────┘  │
│             │                       │
│  _ A _ _ _  │  Usa el teclado para  │
│             │  ingresar la letra    │
│ Errores: 2/6│  que pida el desafiado│
│             │                       │
│  [G][A][T]  │  [Escribe un mensaje] │
│  [O][P][...]│                       │
└─────────────┴───────────────────────┘
```

### Tablero de juego — Vista del desafiado
```
┌─────────────────────────────────────┐
│  jugador_b 8   Ronda 1/4  jugador_a │
├─────────────┬───────────────────────┤
│  🔍 Tablero │  💬 Chat              │
│             │                       │
│  🐾 Animales│  ┌─────────────────┐  │
│  💡 Pista   │  │ Sistema:        │  │
│  🔍 Tú adi. │  │ ✅ La G está    │  │
│             │  │ en la palabra   │  │
│  ████       │  │                 │  │
│  ██ █       │  │ Sistema:        │  │
│  █████      │  │ ❌ La Z no está │  │
│             │  └─────────────────┘  │
│  _ A _ _ _  │                       │
│             │  Pide letras con 🔡   │
│ Errores: 2/6│  o escribe aquí       │
│             │                       │
│  [G][A][T]  │  [Escribe un mensaje] │
│  [O][P][...]│  [🔡 Pedir letra]     │
└─────────────┴───────────────────────┘
```

### Fin de ronda
```
┌─────────────────────────────────────┐
│              🎉                     │
│          ¡Adivinaste!               │
│   Descubriste la palabra "GATO"     │
│                                     │
│  Ronda 1          🔍 Eras desafiado │
│  ┌───────────────────────────────┐  │
│  │   +85 puntos ganados 🎉       │  │
│  └───────────────────────────────┘  │
│                                     │
│  Errores: 2  Letras: 3  Comodines:1 │
│  La palabra era: GATO               │
│                                     │
│     Tú 85     vs    Oponente 60     │
│                                     │
│         [Siguiente ronda →]         │
└─────────────────────────────────────┘
```

### Fin de partida
```
┌─────────────────────────────────────┐
│              🏆                     │
│           ¡Ganaste!                 │
│   ¡Superaste a jugador_b!           │
│                                     │
│         Resultado final             │
│  ┌──────────────────────────────┐   │
│  │  Tú 👑      vs    Oponente   │   │
│  │   240              180       │   │
│  │  Ganador                     │   │
│  └──────────────────────────────┘   │
│                                     │
│  [Jugar de nuevo]                   │
│  [Ver estadísticas]                 │
│  [Ir al inicio]                     │
└─────────────────────────────────────┘
```

---

## ¿Cómo se juega?

### 1. Crear o unirse a una sala

**Anfitrión:**
1. Ve a **Crear sala** y elige el modo de juego
2. Se genera un **código de 6 letras** (ej: `ABCDEF`)
3. Comparte el código con tu oponente
4. Cuando el otro entre, haz click en **Iniciar partida**

**Invitado:**
1. Ve a **Unirme a sala**
2. Ingresa el código de 6 letras que te compartieron
3. Espera a que el anfitrión inicie

---

### 2. El flujo de cada ronda

Cada ronda tiene dos roles que se **alternan**:

| Rol | Qué hace |
|-----|----------|
| 🎯 **Proponente** | Elige la palabra/frase secreta. Controla el teclado y confirma las letras que pide el desafiado. |
| 🔍 **Desafiado** | Ve el tablero con guiones. Pide letras por el chat. Trata de adivinar antes de agotar los errores. |

**Flujo de una ronda:**
```
Proponente escribe la palabra
        ↓
Desafiado ve guiones: _ _ _ _
        ↓
Desafiado pide letra por chat: "¿tiene la A?"
        ↓
Proponente presiona A en el teclado
        ↓
Sistema valida → ✅ correcta o ❌ error
        ↓
Repite hasta adivinar o agotar errores
```

---

### 3. Puntuación

| Situación | Puntos |
|-----------|--------|
| Desafiado adivina la palabra | **100 base** + bonos por velocidad y letras correctas |
| Proponente "defiende" su palabra | **60 base** + 5 pts por cada error del desafiado |
| Penalizaciones | -15 por error, -10 por comodín usado |

---

## Modos de juego

| Modo | Rondas | Timer | Errores máx. | Comodines | Ranking |
|------|--------|-------|-------------|-----------|---------|
| ⚡ **Partida Rápida** | 2 | No | 6 | 3 | No |
| ⚔️ **Duelo** | Libre | No | 6 | 2 | Sí |
| 🏆 **Competitivo** | 6 | 60s | 5 | 1 | Sí |
| 😊 **Casual** | Libre | No | 8 | 3 | No |
| 🔒 **Privado** | Libre | No | 6 | 3 | No |
| 💑 **Frases de Nosotros** | 4 | No | 7 | 3 | No |

---

## Comodines

Los comodines se usan durante la partida para obtener ventajas:

| Comodín | Efecto |
|---------|--------|
| ✨ **Revelar letra** | Muestra una letra al azar de la palabra |
| 🗑️ **Eliminar letras** | Elimina 3 letras incorrectas del teclado |
| 💡 **Pista extra** | Muestra la pista adicional del proponente |
| 🛡️ **Escudo** *(solo proponente)* | El próximo error no cuenta |
| 🔤 **Ver estructura** | Muestra cuántas letras tiene cada palabra |
| ⏱️ **Congelar tiempo** | Agrega 30 segundos al reloj (modo con timer) |

---

## Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| **React 18** | Interfaz de usuario |
| **TypeScript** | Tipado estático |
| **Vite** | Build tool y dev server |
| **Tailwind CSS** | Estilos |
| **Framer Motion** | Animaciones |
| **Supabase** | Base de datos, autenticación y Realtime |
| **Zustand** | Estado global |
| **React Router v6** | Navegación |
| **Playwright** | Tests E2E |
| **Vercel** | Deploy |

---

## Instalación local

### Requisitos
- Node.js 18+
- Una cuenta en [Supabase](https://supabase.com)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/HectorRiquelme/juego-ahorcado.git
cd juego-ahorcado

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 4. Configurar la base de datos
# Ir a Supabase → SQL Editor y ejecutar:
# supabase/schema.sql

# 5. Levantar el servidor de desarrollo
npm run dev
```

### Variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

> Obtén estas credenciales en **Supabase → Settings → API Keys**.

---

## Tests E2E

El proyecto incluye una suite completa de tests con Playwright (20 tests):

```bash
# Instalar browsers
npx playwright install chromium

# Correr todos los tests
npx playwright test

# Correr tests específicos
npx playwright test e2e/01-auth.spec.ts
npx playwright test e2e/03-room.spec.ts
```

### Cobertura de tests

| Suite | Tests |
|-------|-------|
| Autenticación (login, logout, errores) | 7 |
| Navegación y menús | 8 |
| Salas — crear y unirse con código | 3 |
| Partida completa entre dos jugadores | 2 |
| **Total** | **20** |

---

## Estructura del proyecto

```
src/
├── pages/          # Vistas principales (Auth, Home, Game, Lobby...)
├── features/
│   ├── game/       # Lógica del juego (hooks, servicios, componentes)
│   ├── rooms/      # Gestión de salas
│   └── stats/      # Estadísticas de usuario y dúo
├── components/     # Componentes UI reutilizables
├── stores/         # Estado global (Zustand)
├── hooks/          # Hooks personalizados
├── utils/          # Utilidades (wordNormalizer, constants...)
└── lib/            # Clientes externos (Supabase)

supabase/
└── schema.sql      # Schema completo de la base de datos

e2e/
├── helpers.ts      # Utilidades compartidas entre tests
├── 01-auth.spec.ts
├── 02-navigation.spec.ts
├── 03-room.spec.ts
└── 04-game.spec.ts
```

---

## Deploy

El proyecto está configurado para deploy automático en **Vercel** desde la rama `main`.

Variables de entorno requeridas en Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones detalladas.

---

## Licencia

Proyecto personal. Hecho con ❤️
