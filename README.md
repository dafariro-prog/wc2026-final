# WC 2026! · Fase Final 🏆

Polla **independiente** para las fases finales del Mundial 2026: **Octavos → Cuartos → Semifinales → Tercer puesto → Final**. App web mobile-first para 4 amigos (Daniel admin, Camilo, Luis H, Miguel).

Es una app aparte de la de fase de grupos: **su propia base de datos, su propio link y su propia tabla desde cero.**

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Vercel.
- **Zona horaria:** todo en `America/Bogota` (COT).

---

## 🎯 Puntuación (eliminación directa)

No es acumulativa: se toma la mejor categoría. El "ganador" es el equipo que **avanza** (incluye prórroga/penales).

| Categoría | Puntos |
|---|---|
| 🎯 Marcador exacto **y** ganador correcto | **4** |
| ✅ Ganador (equipo que avanza) correcto | **3** |
| ½ Acierta los goles de un equipo | **1** |
| — Nada | **0** |

- En empates, tanto el jugador (al pronosticar) como el admin (al cargar resultado) eligen **quién avanza**; se puede registrar el marcador de **penales**.
- El marcador exacto se evalúa sobre el resultado del partido (antes de penales).

Lógica en [`src/lib/scoring.ts`](src/lib/scoring.ts) (`calculateKnockoutPoints`), con tests en [`src/lib/scoring.test.ts`](src/lib/scoring.test.ts).

## 🔀 Propagación automática

Al cerrar una llave, el **ganador pasa solo** a la siguiente ([`src/lib/bracket.ts`](src/lib/bracket.ts)); el **perdedor de semifinal** va al partido de tercer puesto.

---

## 🚀 Instalación local

```bash
npm install
cp .env.local.example .env.local   # completa los valores
npm run dev                        # http://localhost:3000
npm test                           # tests de puntuación
```

## 🗄️ Configurar Supabase (proyecto NUEVO, aparte del de grupos)

1. Crea un **proyecto nuevo** en [supabase.com](https://supabase.com) (plan Free).
2. **SQL Editor → New query** → pega [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Otra query → pega [`supabase/seed.sql`](supabase/seed.sql) → **Run** (crea los 4 usuarios).
4. **Settings → API** → copia a `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SESSION_SECRET=...            # openssl rand -base64 32
   ```

### PINs por defecto
Daniel `1234` (admin) · Camilo `1111` · Luis H `2222` · Miguel `3333`. Cámbialos con `npm run hash:pins`.

## ⚽ Cargar los 16 partidos de la fase final

```bash
npm run seed:matches
```

Entran como "Por definir" (Octavos 1-8, Cuartos 9-12, Semis 13-14, Tercer puesto 15, Final 16).

## ☁️ Desplegar en Vercel

Sube a un repo de GitHub → impórtalo en [vercel.com](https://vercel.com) → agrega las 4 variables de entorno → **Deploy**.

---

## 👑 Cómo lo usa el admin (Daniel)

1. Entra y ve a **Admin → Fases finales**.
2. Asigna los equipos de los **Octavos** a medida que se definan (formulario "Asignar equipos / fecha"). Al guardar, la llave se abre para pronosticar.
3. Cuando se juegue, carga el resultado; si hay empate eliges **quién avanza** (y penales). Se calculan los puntos y el ganador **se propaga** a la siguiente llave automáticamente.

## 🙋 Cómo juega cada participante

Entra con su nombre + PIN → **Pronósticos** → marcador de cada partido abierto (y en empates, elige quién avanza) → **Guardar**. Ve su puntaje en **Tabla** y el historial en **Resultados**.
