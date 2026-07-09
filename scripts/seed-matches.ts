/**
 * Siembra los 16 partidos de la FASE FINAL (Octavos → Final) numerados 1..16,
 * con equipos "Por definir" y fechas/horas oficiales (COT). Editables desde Admin.
 *
 * Uso:  npm run seed:matches
 *
 * Idempotente y NO destructivo: si un partido ya existe (por match_number),
 * NO lo sobreescribe (no borra equipos que ya hayas asignado).
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

// [match_number, ronda, fecha, hora COT (HH:MM)]
const FIXTURES: [number, string, string, string][] = [
  // Octavos de final
  [1, "Octavos de final", "2026-07-04", "16:00"],
  [2, "Octavos de final", "2026-07-04", "12:00"],
  [3, "Octavos de final", "2026-07-05", "15:00"],
  [4, "Octavos de final", "2026-07-05", "19:00"],
  [5, "Octavos de final", "2026-07-06", "14:00"],
  [6, "Octavos de final", "2026-07-06", "19:00"],
  [7, "Octavos de final", "2026-07-07", "11:00"],
  [8, "Octavos de final", "2026-07-07", "15:00"],
  // Cuartos de final
  [9, "Cuartos de final", "2026-07-09", "15:00"],
  [10, "Cuartos de final", "2026-07-10", "14:00"],
  [11, "Cuartos de final", "2026-07-11", "16:00"],
  [12, "Cuartos de final", "2026-07-11", "20:00"],
  // Semifinales
  [13, "Semifinal", "2026-07-14", "14:00"],
  [14, "Semifinal", "2026-07-15", "14:00"],
  // Tercer puesto
  [15, "Tercer puesto", "2026-07-18", "16:00"],
  // Final
  [16, "Final", "2026-07-19", "14:00"],
];

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const rows = FIXTURES.map(([num, round, date, time]) => ({
    match_number: num,
    group_name: round,
    jornada: null,
    match_date: date,
    match_time: `${time}:00`,
    home_team: TBD,
    away_team: TBD,
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
