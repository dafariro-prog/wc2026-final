/**
 * Lógica central de puntuación de la polla WC 2026!.
 *
 * Función PURA: dado un pronóstico y el resultado real, retorna los puntos
 * y la razón. La puntuación NO es acumulativa: se toma SOLO la mejor
 * categoría aplicable.
 *
 *   1. Marcador exacto ............ 4 puntos
 *   2. Resultado acertado ......... 3 puntos  (ganador correcto o empate)
 *   3. Marcador parcial ........... 1 punto   (acierta goles de un equipo)
 *   4. Sin puntos ................. 0 puntos
 *
 * Reglas finas:
 *  - Si acierta el resultado Y los goles de un equipo => 3 (no 1, no 4).
 *  - Solo recibe 4 si el marcador completo es exacto.
 */

export type Score = {
  home: number;
  away: number;
};

export type PointsReason =
  | "Marcador exacto"
  | "Resultado acertado"
  | "Marcador parcial"
  | "Sin puntos";

export type PointsResult = {
  points: 0 | 1 | 3 | 4;
  reason: PointsReason;
};

/** Signo del resultado: 1 gana local, -1 gana visitante, 0 empate. */
function outcome(home: number, away: number): -1 | 0 | 1 {
  if (home > away) return 1;
  if (home < away) return -1;
  return 0;
}

/** Lado que avanza: 'a' local, 'b' visitante. En empate usa el override (penales). */
type Side = "a" | "b" | null;
function winnerSide(home: number, away: number, override: Side = null): Side {
  if (home > away) return "a";
  if (home < away) return "b";
  return override;
}

/**
 * Puntuación para llaves de ELIMINACIÓN (Ronda de 32 → Final).
 * A diferencia de la fase de grupos, el "ganador" es el equipo que AVANZA
 * (incluyendo prórroga/penales). El marcador exacto se evalúa sobre el
 * marcador del partido (antes de penales).
 *
 *   4 = marcador exacto Y ganador correcto
 *   3 = ganador (equipo que avanza) correcto
 *   1 = acierta los goles de uno de los dos equipos
 *   0 = nada
 */
export function calculateKnockoutPoints(
  prediction: Score & { winner?: Side },
  actual: Score & { winner?: Side }
): PointsResult {
  const { home: ph, away: pa } = prediction;
  const { home: ah, away: aa } = actual;
  const predW = winnerSide(ph, pa, prediction.winner ?? null);
  const realW = winnerSide(ah, aa, actual.winner ?? null);

  if (ph === ah && pa === aa && predW === realW) {
    return { points: 4, reason: "Marcador exacto" };
  }
  if (predW !== null && realW !== null && predW === realW) {
    return { points: 3, reason: "Resultado acertado" };
  }
  if (ph === ah || pa === aa) {
    return { points: 1, reason: "Marcador parcial" };
  }
  return { points: 0, reason: "Sin puntos" };
}

/**
 * Calcula los puntos de un pronóstico frente al resultado real.
 *
 * @param prediction Marcador pronosticado por el usuario.
 * @param actual     Marcador real del partido.
 */
export function calculatePoints(
  prediction: Score,
  actual: Score
): PointsResult {
  const { home: ph, away: pa } = prediction;
  const { home: ah, away: aa } = actual;

  // 1. Marcador exacto.
  if (ph === ah && pa === aa) {
    return { points: 4, reason: "Marcador exacto" };
  }

  // 2. Resultado acertado (mismo ganador o empate).
  if (outcome(ph, pa) === outcome(ah, aa)) {
    return { points: 3, reason: "Resultado acertado" };
  }

  // 3. Marcador parcial (acierta los goles de uno de los dos equipos).
  if (ph === ah || pa === aa) {
    return { points: 1, reason: "Marcador parcial" };
  }

  // 4. Nada acertado.
  return { points: 0, reason: "Sin puntos" };
}
