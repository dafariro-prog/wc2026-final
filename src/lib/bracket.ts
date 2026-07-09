import type { WinnerSide } from "./types";

/**
 * Cuadro de eliminación de la FASE FINAL (Octavos → Final), numerado 1..16.
 *   Octavos:        1-8
 *   Cuartos:        9-12
 *   Semifinales:    13-14
 *   Tercer puesto:  15
 *   Final:          16
 *
 * Para cada partido indica a qué llave y lado ('a' local / 'b' visitante)
 * van el GANADOR y, en semifinales, el PERDEDOR (al tercer puesto).
 */
export type BracketTarget = { matchNumber: number; slot: WinnerSide };

type BracketNode = {
  winnerTo?: BracketTarget;
  loserTo?: BracketTarget;
};

export const BRACKET: Record<number, BracketNode> = {
  // Octavos -> Cuartos
  1: { winnerTo: { matchNumber: 9, slot: "a" } },
  2: { winnerTo: { matchNumber: 9, slot: "b" } },
  3: { winnerTo: { matchNumber: 11, slot: "a" } },
  4: { winnerTo: { matchNumber: 11, slot: "b" } },
  5: { winnerTo: { matchNumber: 10, slot: "a" } },
  6: { winnerTo: { matchNumber: 10, slot: "b" } },
  7: { winnerTo: { matchNumber: 12, slot: "a" } },
  8: { winnerTo: { matchNumber: 12, slot: "b" } },

  // Cuartos -> Semifinales
  9: { winnerTo: { matchNumber: 13, slot: "a" } },
  10: { winnerTo: { matchNumber: 13, slot: "b" } },
  11: { winnerTo: { matchNumber: 14, slot: "a" } },
  12: { winnerTo: { matchNumber: 14, slot: "b" } },

  // Semifinales -> Final (ganador) y Tercer puesto (perdedor)
  13: {
    winnerTo: { matchNumber: 16, slot: "a" },
    loserTo: { matchNumber: 15, slot: "a" },
  },
  14: {
    winnerTo: { matchNumber: 16, slot: "b" },
    loserTo: { matchNumber: 15, slot: "b" },
  },
  // 15 (tercer puesto) y 16 (final) no propagan.
};
