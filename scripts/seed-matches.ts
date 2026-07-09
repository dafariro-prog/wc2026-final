/**
 * Siembra los 8 partidos de la FASE FINAL (Cuartos → Final) numerados 1..8.
 * Los Cuartos entran con equipos ya definidos; Semis/3er puesto/Final quedan
 * "Por definir" y se llenan solos por propagación al cargar resultados.
 *
 * Uso:  npm run seed:matches
 *
 * Idempotente y NO destructivo: si un partido ya existe (por match_number),
 * NO lo sobreescribe (no borra equipos que ya se hayan definido/propagado).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* vars ya en entorno */
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const TBD = "Por definir";

// [match_number, ronda, fecha, hora COT (HH:MM), equipo_local, equipo_visitante]
const FIXTURES: [number, string, string, string, string, string][] = [
  // Cuartos de final (equipos ya clasificados)
  [1, "Cuartos de final", "2026-07-09", "15:00", "Francia", "Marruecos"],
  [2, "Cuartos de final", "2026-07-10", "14:00", "España", "Bélgica"],
  [3, "Cuartos de final", "2026-07-11", "16:00", "Noruega", "Inglaterra"],
  [4, "Cuartos de final", "2026-07-11", "20:00", "Argentina", "Suiza"],
  // Semifinales (se llenan por propagación)
  [5, "Semifinal", "2026-07-14", "14:00", TBD, TBD],
  [6, "Semifinal", "2026-07-15", "14:00", TBD, TBD],
  // Tercer puesto
  [7, "Tercer puesto", "2026-07-18", "16:00", TBD, TBD],
  // Final
  [8, "Final", "2026-07-19", "14:00", TBD, TBD],
];

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const rows = FIXTURES.map(([num, round, date, time, home, away]) => ({
    match_number: num,
    group_name: round,
    jornada: null,
    match_date: date,
    match_time: `${time}:00`,
    home_team: home,
    away_team: away,
    venue: null,
    status: "scheduled" as const,
  }));

  const { error, count } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "match_number", ignoreDuplicates: true, count: "exact" });

  if (error) {
    console.error("Error al sembrar la fase final:", error.message);
    process.exit(1);
  }
  console.log(`OK: ${count ?? 0} llaves nuevas insertadas (las existentes no se tocaron).`);
}

main();
