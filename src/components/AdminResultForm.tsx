"use client";

import { useActionState, useState } from "react";
import {
  saveResultAction,
  recalcResultAction,
  clearResultAction,
  type AdminState,
} from "@/app/actions/admin";
import { teamFlag } from "@/lib/teams";
import { isKnockout } from "@/lib/format";
import type { Match } from "@/lib/types";

const initial: AdminState = { error: null, ok: false };

export function AdminResultForm({ match }: { match: Match }) {
  const [state, action, pending] = useActionState(saveResultAction, initial);
  const [recalcState, recalcAction, recalcPending] = useActionState(recalcResultAction, initial);
  const [clearState, clearAction, clearPending] = useActionState(clearResultAction, initial);

  const knockout = isKnockout(match.group_name);
  const [home, setHome] = useState(match.home_score?.toString() ?? "");
  const [away, setAway] = useState(match.away_score?.toString() ?? "");
  const [winner, setWinner] = useState<"a" | "b" | null>(match.winner_side);
  const [penH, setPenH] = useState(match.penalty_home?.toString() ?? "");
  const [penA, setPenA] = useState(match.penalty_away?.toString() ?? "");

  const isDraw = home !== "" && away !== "" && home === away;
  const needsWinner = knockout && isDraw;
  const canSubmit = home !== "" && away !== "" && (!needsWinner || winner !== null);

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium">
          {match.group_name} · #{match.match_number}
        </span>
        {match.points_calculated ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            ✓ Calculado
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/30">
            Sin resultado
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold">
        <span className="flex items-center gap-1.5">
          {teamFlag(match.home_team)} {match.home_team}
        </span>
        <span className="text-slate-500">vs</span>
        <span className="flex items-center gap-1.5">
          {match.away_team} {teamFlag(match.away_team)}
        </span>
      </div>

      <form action={action}>
        <input type="hidden" name="matchId" value={match.id} />
        {needsWinner && winner && <input type="hidden" name="winnerSide" value={winner} />}
        {needsWinner && <input type="hidden" name="penaltyHome" value={penH} />}
        {needsWinner && <input type="hidden" name="penaltyAway" value={penA} />}

        <div className="flex items-center justify-center gap-2">
          <ScoreBox value={home} onChange={setHome} aria-label={`Goles ${match.home_team}`} />
          <span className="font-bold text-slate-500">:</span>
          <ScoreBox value={away} onChange={setAway} aria-label={`Goles ${match.away_team}`} />
          <button
            type="submit"
            disabled={pending || !canSubmit}
            className="ml-2 flex-1 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            {pending ? "Guardando…" : match.points_calculated ? "Corregir" : "Guardar y calcular"}
          </button>
        </div>

        {needsWinner && (
          <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2.5">
            <p className="mb-1.5 text-center text-xs font-semibold text-violet-200">
              Empate: ¿quién avanza?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <WinnerBtn selected={winner === "a"} onClick={() => setWinner("a")}>
                {match.home_team}
              </WinnerBtn>
              <WinnerBtn selected={winner === "b"} onClick={() => setWinner("b")}>
                {match.away_team}
              </WinnerBtn>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-300">
              <span>Penales (opcional):</span>
              <PenBox value={penH} onChange={setPenH} aria-label="Penales local" />
              <span className="font-bold text-slate-500">:</span>
              <PenBox value={penA} onChange={setPenA} aria-label="Penales visitante" />
            </div>
          </div>
        )}
      </form>

      {match.points_calculated && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <form action={recalcAction}>
            <input type="hidden" name="matchId" value={match.id} />
            <button
              type="submit"
              disabled={recalcPending}
              className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              {recalcPending ? "Recalculando…" : "Recalcular puntos"}
            </button>
          </form>
          <form
            action={clearAction}
            onSubmit={(e) => {
              if (
                !confirm(
                  `¿Borrar el resultado de ${match.home_team} vs ${match.away_team}? El partido quedará abierto de nuevo y se reiniciarán sus puntos.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="matchId" value={match.id} />
            <button
              type="submit"
              disabled={clearPending}
              className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              {clearPending ? "Borrando…" : "🗑️ Borrar resultado"}
            </button>
          </form>
        </div>
      )}

      {(state.error || recalcState.error || clearState.error) && (
        <p className="mt-2 text-center text-xs text-red-300">
          {state.error ?? recalcState.error ?? clearState.error}
        </p>
      )}
      {(state.message || recalcState.message || clearState.message) &&
        !state.error &&
        !recalcState.error &&
        !clearState.error && (
          <p className="mt-2 text-center text-xs font-medium text-emerald-300">
            {state.message ?? recalcState.message ?? clearState.message}
          </p>
        )}
    </article>
  );
}

function ScoreBox({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  return (
    <input
      {...rest}
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      className="h-12 w-12 rounded-lg border border-white/15 bg-white/5 text-center text-xl font-bold outline-none focus:border-emerald-400"
    />
  );
}

function PenBox({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  return (
    <input
      {...rest}
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      className="h-8 w-10 rounded-md border border-white/15 bg-white/5 text-center text-sm font-bold outline-none focus:border-violet-400"
    />
  );
}

function WinnerBtn({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`truncate rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${
        selected
          ? "border-violet-400 bg-violet-400/20 text-violet-100"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
