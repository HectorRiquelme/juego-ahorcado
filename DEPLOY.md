# Guía de Despliegue — Cuellito

## Paso 1: Crear proyecto en Supabase

1. Ve a https://supabase.com → "New Project"
2. Elige nombre: `cuellito`
3. Elige región más cercana (ej: South America / São Paulo)
4. Guarda la contraseña de la DB
5. Espera 2 minutos a que el proyecto se inicialice

## Paso 2: Ejecutar el schema SQL

1. En Supabase → "SQL Editor" → "New Query"
2. Copia y pega el contenido de `supabase/schema.sql`
3. Ejecuta → Verifica que no haya errores
4. Verifica en "Table Editor" que se crearon las tablas

## Paso 3: Obtener las claves de Supabase

En Supabase → "Settings" → "API":
- `Project URL` → `VITE_SUPABASE_URL`
- `anon / public key` → `VITE_SUPABASE_ANON_KEY`

## Paso 4: Configurar Supabase Auth

En Supabase → "Authentication" → "Settings":
- Site URL: `https://tu-app.vercel.app`
- Redirect URLs: `https://tu-app.vercel.app/**`
- Email: habilitar "Email provider"
- (Opcional) Deshabilitar "Confirm email" durante desarrollo

## Paso 5: Instalar dependencias localmente

```bash
npm install
```

## Paso 6: Configurar variables locales

```bash
cp .env.example .env
# Editar .env con tus claves de Supabase
```

## Paso 7: Probar en local

```bash
npm run dev
# Abrir http://localhost:5173
```

Prueba:
1. Registrar cuenta A
2. Registrar cuenta B (en otra pestaña incógnito)
3. Con A: crear sala → copiar código
4. Con B: unirse con el código
5. Iniciar partida desde A
6. Jugar ronda completa
7. Verificar que stats se actualizan en /stats

## Paso 8: Desplegar en Vercel

### Opción A: Con GitHub (Recomendado)

1. Sube el proyecto a un repo de GitHub
2. Ve a https://vercel.com → "New Project"
3. Importa tu repo de GitHub
4. Framework: Vite (auto-detectado)
5. Variables de entorno:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
6. Deploy → ¡Listo!

### Opción B: Con Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
# Sigue los pasos, agrega las env vars cuando te las pida
```

## Paso 9: Actualizar URLs en Supabase

Cuando tengas la URL de Vercel (ej: `cuellito.vercel.app`):

1. Supabase → Authentication → Settings
2. Site URL: `https://cuellito.vercel.app`
3. Allowed Redirect URLs: `https://cuellito.vercel.app/**`

## Paso 10: Verificar producción

1. Abre la URL de Vercel
2. Registrar dos cuentas
3. Crear sala → compartir código → unirse
4. Jugar una partida completa
5. Verificar realtime (ambas ventanas deben sincronizarse)
6. Verificar stats en /stats

---

## Troubleshooting

### "Failed to load resource" en Supabase
→ Verifica que las env vars en Vercel estén correctas y redeploya

### Realtime no funciona
→ Verifica que las tablas tengan `ALTER PUBLICATION supabase_realtime ADD TABLE ...`
→ El free tier permite hasta 200 conexiones simultáneas

### "Row Level Security violation"
→ Verifica que el usuario esté autenticado
→ Revisa las policies en Supabase → Authentication → Policies

### La palabra se revela antes de tiempo
→ Verificar que el RLS en `rounds` esté correctamente configurado
→ El campo `word_encoded` solo debe ser decodificable client-side cuando corresponda

---

## Roadmap de Crecimiento

### FASE 1: MVP (actual)
- ✅ Auth completo
- ✅ Creación/unión de salas
- ✅ Ronda de ahorcado en tiempo real
- ✅ Guardado de resultados
- ✅ Estadísticas persistentes
- ✅ UI responsive y animada
- ✅ Comodines (6 tipos)

### FASE 2: Estadísticas ampliadas
- Dashboard de estadísticas por dupla
- Gráficos de progreso temporal
- Categorías con mejor/peor rendimiento
- Historial de partidas paginado

### FASE 3: Experiencia de pareja
- Modo "Frases de Nosotros" completo
- Colecciones privadas de palabras
- Racha compartida visual
- Comparativas divertidas entre los dos

### FASE 4: Personalización avanzada
- Temas visuales (modo claro, paletas alternativas)
- Avatar personalizable
- Categorías temáticas (películas de los 90s, etc.)
- Importar/exportar palabras

### FASE 5: Torneos y rankings
- Rankings privados entre amigos
- Torneos de 3+ jugadores (nuevo modo)
- Logros y medallas
- Supabase Edge Functions para lógica anti-trampa
