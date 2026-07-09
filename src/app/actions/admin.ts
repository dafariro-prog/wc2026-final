"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { calculatePoints, calculateKnockoutPoints } from "@/lib/scoring";
import { isKnockout } from "@/lib/format";
import { BRACKET } from "@/lib/bracket";
import type { Prediction, WinnerSide } from "@/lib/types";

export type AdminState = { error: string | null; ok: boolean; message?: string };

/**
 * Asigna/edita los equipos, fecha, hora y sede de una llave de eliminación.
 * Solo admin. Útil para llenar las fases finales a medida que se definen.
 */
export async function saveFixtureAction(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "No autorizado.", ok: false };
  }

  const matchId = String(formData.get("matchId") ?? "");
  const home = String(formData.get("home_team") ?? "").trim();
  const away = String(formData.get("away_team") ?? "").trim();
  const date = String(formData.get("match_date") ?? "").trim();
  const time = String(formData.get("match_time") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();

  if (!matchId) return { error: "Partido inválido.", ok: false };
  if (!home || !away) return { error: "Escribe ambos equipos.", ok: false };
  if (home === away) return { error: "Los equipos deben ser distintos.", ok: false };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha inválida.", ok: false };
  if (!/^\d{2}:\d{2}/.test(time)) return { error: "Hora inválida.", ok: false };

  const sb = getServiceClient();
  const { error } = await sb
    .from("matches")
    .update({
      home_team: home,
      away_team: away,
      match_date: date,
      match_time: time.length === 5 ? `${time}:00` : time,
      venue: venue || null,
    })
    .eq("id", matchId);

  if (error) return { error: "No se pudo guardar la llave.", ok: false };

  revalidatePath("/admin");
  revalidatePath("/predicciones");
  revalidatePath("/dashboard");
  revalidatePath(`/partido/${matchId}`);
  return { error: null, ok: true, message: `Llave actualizada: ${home} vs ${away}.` };
}

type MatchForCalc = {
  id: string;
  group_name: string;
  home_score: number | null;
  away_score: number | null;
  winner_side: WinnerSide | null;
};

/** Recalcula los puntos de las predicciones de un partido (grupos o eliminación). */
async function recalculateMatch(match: MatchForCalc): Promise<number> {
  const sb = getServiceClient();
  if (match.home_score === null || match.away_score === null) return 0;
  const knockout = isKnockout(match.group_name);

  const { data: preds, error } = await sb
    .from("predictions")
    .select("id, predicted_home_score, predicted_away_score, predicted_winner_side")
    .eq("match_id", match.id);
  if (error) throw error;

  for (const p of (preds ?? []) as Pick<
    Prediction,
    "id" | "predicted_home_score" | "predicted_away_score" | "predicted_winner_side"
  >[]) {
    const { points, reason } = knockout
      ? calculateKnockoutPoints(
          {
            home: p.predicted_home_score,
            away: p.predicted_away_score,
            winner: p.predicted_winner_side,
          },
          { home: match.home_score, away: match.away_score, winner: match.winner_side }
        )
      : calculatePoints(
          { home: p.predicted_home_score, away: p.predicted_away_score },
          { home: match.home_score, away: match.away_score }
        );
    const { error: upErr } = await sb
      .from("predictions")
      .update({ points_awarded: points, points_reason: reason })
      .eq("id", p.id);
    if (upErr) throw upErr;
  }
  return (preds ?? []).length;
}

/** Propaga el ganador (y el perdedor en semis) a la(s) siguiente(s) llave(s). */
async function propagateBracket(match: {
  match_number: number;
  home_team: string;
  away_team: string;
  winner_side: WinnerSide;
}): Promise<void> {
  const node = BRACKET[match.match_number];
  if (!node) return;
  const sb = getServiceClient();
  const winnerTeam = match.winner_side === "a" ? match.home_team : match.away_team;
  const loserTeam = match.winner_side === "a" ? match.away_team : match.home_team;

  if (node.winnerTo) {
    const col = node.winnerTo.slot === "a" ? "home_team" : "away_team";
    await sb
      .from("matches")
      .update({ [col]: winnerTeam })
      .eq("match_number", node.winnerTo.matchNumber);
  }
  if (node.loserTo) {
    const col = node.loserTo.slot === "a" ? "home_team" : "away_team";
    await sb
      .from("matches")
      .update({ [col]: loserTeam })
      .eq("match_number", node.loserTo.matchNumber);
  }
}

/**
 * Guarda el resultado real de un partido y calcula los puntos de TODAS las
 * predicciones. En eliminación: registra quién avanza (y penales) y propaga
 * el ganador a la siguiente llave. Solo admin. Sirve también para CORREGIR.
 */
export async function saveResultAction(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "No autorizado.", ok: false };
  }

  const matchId = String(formData.get("matchId") ?? "");
  const home = Number(formData.get("home"));
  const away = Number(formData.get("away"));

  if (!matchId) return { error: "Partido inválido.", ok: false };
  if (
    formData.get("home") === "" ||
    formData.get("away") === "" ||
    Number.isNaN(home) ||
    Number.isNaN(away)
  ) {
    return { error: "Ingresa ambos marcadores.", ok: false };
  }
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return { error: "Los marcadores deben ser enteros 0 o mayores.", ok: false };
  }

  const sb = getServiceClient();
  const { data: match, error: getErr } = await sb
    .from("matches")
    .select("match_number, group_name, home_team, away_team")
    .eq("id", matchId)
    .maybeSingle();
  if (getErr || !match) return { error: "Partido no encontrado.", ok: false };

  const knockout = isKnockout(match.group_name as string);

  // Determinar quién avanza (solo eliminación).
  let winnerSide: WinnerSide | null = null;
  if (knockout) {
    if (home > away) winnerSide = "a";
    else if (home < away) winnerSide = "b";
    else {
      const raw = String(formData.get("winnerSide") ?? "");
      if (raw !== "a" && raw !== "b") {
        return { error: "Empate: elige qué equipo avanza (penales).", ok: false };
      }
      winnerSide = raw;
    }
  }

  // Penales (opcionales; solo eliminación con empate).
  let penaltyHome: number | null = null;
  let penaltyAway: number | null = null;
  const phRaw = String(formData.get("penaltyHome") ?? "");
  const paRaw = String(formData.get("penaltyAway") ?? "");
  if (knockout && home === away && phRaw !== "" && paRaw !== "") {
    const ph = Number(phRaw);
    const pa = Number(paRaw);
    if (!Number.isInteger(ph) || !Number.isInteger(pa) || ph < 0 || pa < 0) {
      return { error: "Penales inválidos.", ok: false };
    }
    penaltyHome = ph;
    penaltyAway = pa;
  }

  const { error: matchErr } = await sb
    .from("matches")
    .update({
      home_score: home,
      away_score: away,
      winner_side: winnerSide,
      penalty_home: penaltyHome,
      penalty_away: penaltyAway,
      status: "finished",
      points_calculated: true,
    })
    .eq("id", matchId);
  if (matchErr) return { error: "No se pudo guardar el resultado.", ok: false };

  let n = 0;
  try {
    n = await recalculateMatch({
      id: matchId,
      group_name: match.group_name as string,
      home_score: home,
      away_score: away,
      winner_side: winnerSide,
    });
  } catch {
    return { error: "Resultado guardado, pero falló el cálculo de puntos.", ok: false };
  }

  let propagated = "";
  if (knockout && winnerSide) {
    try {
      await propagateBracket({
        match_number: match.match_number as number,
        home_team: match.home_team as string,
        away_team: match.away_team as string,
        winner_side: winnerSide,
      });
      const winnerTeam = winnerSide === "a" ? match.home_team : match.away_team;
      propagated = ` ${winnerTeam} avanza.`;
    } catch {
      /* el resultado quedó guardado aunque falle la propagación */
    }
  }

  revalidatePath("/admin");
  revalidatePath("/tabla");
  revalidatePath("/dashboard");
  revalidatePath("/predicciones");
  revalidatePath(`/partido/${matchId}`);
  return {
    error: null,
    ok: true,
    message: `Resultado ${home}-${away} guardado. Puntos para ${n} predicción(es).${propagated}`,
  };
}

/**
 * Borra el resultado real de un partido: lo vuelve a 'scheduled', quita el
 * marcador/penales/ganador, desmarca points_calculated y resetea los puntos de
 * las predicciones (conserva los marcadores pronosticados). Solo admin.
 */
export async function clearResultAction(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "No autorizado.", ok: false };
  }

  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return { error: "Partido inválido.", ok: false };

  const sb = getServiceClient();

  const { error: matchErr } = await sb
    .from("matches")
    .update({
      home_score: null,
      away_score: null,
      winner_side: null,
      penalty_home: null,
      penalty_away: null,
      status: "scheduled",
      points_calculated: false,
    })
    .eq("id", matchId);
  if (matchErr) return { error: "No se pudo borrar el resultado.", ok: false };

  const { error: predErr } = await sb
    .from("predictions")
    .update({ points_awarded: 0, points_reason: null })
    .eq("match_id", matchId);
  if (predErr) {
    return { error: "Resultado borrado, pero falló el reseteo de puntos.", ok: false };
  }

  revalidatePath("/admin");
  revalidatePath("/tabla");
  revalidatePath("/dashboard");
  revalidatePath(`/partido/${matchId}`);
  return {
    error: null,
    ok: true,
    message: "Resultado borrado. El partido quedó abierto de nuevo.",
  };
}

/** Recalcula los puntos de un partido ya finalizado (sin cambiar el marcador). */
export async function recalcResultAction(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "No autorizado.", ok: false };
  }

  const matchId = String(formData.get("matchId") ?? "");
  const sb = getServiceClient();
  const { data: match, error } = await sb
    .from("matches")
    .select("id, group_name, home_score, away_score, winner_side")
    .eq("id", matchId)
    .maybeSingle();

  if (error || !match || match.home_score === null || match.away_score === null) {
    return { error: "El partido no tiene resultado para recalcular.", ok: false };
  }

  let n = 0;
  try {
    n = await recalculateMatch(match as MatchForCalc);
  } catch {
    return { error: "Falló el recálculo.", ok: false };
  }

  revalidatePath("/admin");
  revalidatePath("/tabla");
  revalidatePath("/dashboard");
  revalidatePath(`/partido/${matchId}`);
  return { error: null, ok: true, message: `Puntos recalculados para ${n} predicción(es).` };
}
