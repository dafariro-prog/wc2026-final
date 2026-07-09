"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { hasKickedOff, isKnockout } from "@/lib/format";
import type { Match, WinnerSide } from "@/lib/types";

export type SavePredictionState = { error: string | null; ok: boolean };

/**
 * Guarda (o actualiza) la predicción del usuario en sesión para un partido.
 * Reglas reforzadas en el servidor:
 *  - Requiere sesión.
 *  - El usuario solo puede guardar SU propia predicción.
 *  - No se permite si el partido ya empezó (kickoff_at <= now).
 *  - Marcadores enteros >= 0.
 */
export async function savePredictionAction(
  _prev: SavePredictionState,
  formData: FormData
): Promise<SavePredictionState> {
  const session = await getSession();
  if (!session) return { error: "Sesión expirada. Vuelve a entrar.", ok: false };

  const matchId = String(formData.get("matchId") ?? "");
  const home = Number(formData.get("home"));
  const away = Number(formData.get("away"));

  if (!matchId) return { error: "Partido inválido.", ok: false };
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return { error: "Ingresa marcadores válidos (enteros, 0 o más).", ok: false };
  }
  if (home > 99 || away > 99) {
    return { error: "Marcador demasiado alto.", ok: false };
  }

  const sb = getServiceClient();

  // Verificar bloqueo por hora de inicio (autoridad: el servidor).
  const { data: match, error: matchErr } = await sb
    .from("matches")
    .select("id, kickoff_at, status, group_name, home_team, away_team")
    .eq("id", matchId)
    .maybeSingle();

  if (matchErr || !match) return { error: "Partido no encontrado.", ok: false };
  if (hasKickedOff(match as Pick<Match, "kickoff_at">)) {
    return { error: "El partido ya comenzó. La predicción está bloqueada.", ok: false };
  }

  // En eliminación no hay empates: si pronostica empate debe elegir quién avanza.
  const knockout = isKnockout((match as { group_name: string }).group_name);
  let winnerSide: WinnerSide | null = null;
  if (home !== away) {
    winnerSide = home > away ? "a" : "b";
  } else if (knockout) {
    const raw = String(formData.get("winnerSide") ?? "");
    if (raw !== "a" && raw !== "b") {
      return { error: "Es un partido de eliminación: elige qué equipo avanza.", ok: false };
    }
    winnerSide = raw;
  }

  const { error: upErr } = await sb.from("predictions").upsert(
    {
      match_id: matchId,
      user_id: session.id,
      predicted_home_score: home,
      predicted_away_score: away,
      predicted_winner_side: winnerSide,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id,user_id" }
  );

  if (upErr) return { error: "No se pudo guardar la predicción.", ok: false };

  revalidatePath("/predicciones");
  revalidatePath("/dashboard");
  revalidatePath(`/partido/${matchId}`);
  return { error: null, ok: true };
}
