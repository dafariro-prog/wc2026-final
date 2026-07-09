import type { WinnerSide } from "./types";

/**
 * Cuadro de eliminación de la FASE FINAL (Cuartos → Final), numerado 1..8.
 *   Cuartos de final:  1-4
 *   Semifinales:       5-6
 *   Tercer puesto:     7
 *   Final:             8
 *
 * SF1(5) = ganador(1) vs ganador(2);  SF2(6) = ganador(3) vs ganador(4).
 * Final(8) = ganador SF1 vs ganador SF2;  3er puesto(7) = perdedores de las semis.
 */
export type BracketTarget = { matchNumber: number; slot: WinnerSide };

type BracketNode = {
  winnerTo?: BracketTarget;
  loserTo?: BracketTarget;
};

export const BRACKET: Record<number, BracketNode> = {
  // Cuartos -> Semifinales
  1: { winnerTo: { matchNumber: 5, slot: "a" } },
  2: { winnerTo: { matchNumber: 5, slot: "b" } },
  3: { winnerTo: { matchNumber: 6, slot: "a" } },
  4: { winnerTo: { matchNumber: 6, slot: "b" } },

  // Semifinales -> Final (ganador) y Tercer puesto (perdedor)
  5: {
    winnerTo: { matchNumber: 8, slot: "a" },
    loserTo: { matchNumber: 7, slot: "a" },
  },
  6: {
    winnerTo: { matchNumber: 8, slot: "b" },
    loserTo: { matchNumber: 7, slot: "b" },
  },
  // 7 (tercer puesto) y 8 (final) no propagan.
};
