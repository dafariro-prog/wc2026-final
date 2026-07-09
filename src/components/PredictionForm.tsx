"use client";

import { useActionState, useEffect, useState } from "react";
import { savePredictionAction, type SavePredictionState } from "@/app/actions/predictions";

const initial: SavePredictionState = { error: null, ok: false };

export function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  initialHome,
  initialAway,
  knockout = false,
  initialWinner = null,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  initialHome: number | null;
  initialAway: number | null;
  knockout?: boolean;
  initialWinner?: "a" | "b" | null;
}) {
  const [state, action, pending] = useActionState(savePredictionAction, initial);
  const [home, setHome] = useState(initialHome?.toString() ?? "");
  const [away, setAway] = useState(initialAway?.toString() ?? "");
  const [winner, setWinner] = useState<"a" | "b" | null>(initialWinner);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  const isDraw = home !== "" && away !== "" && home === away;
  const needsWinner = knockout && isDraw;
  const canSubmit = home !== "" && away !== "" && (!needsWinner || winner !== null);

  return (
    <form action={action} className="mt-3 border-t border-white/10 pt-3">
      <input type="hidden" name="matchId" value={matchId} />
      {needsWinner && winner && <input type="hidden" name="winnerSide" value={winner} />}
      <div className="flex items-center justify-center gap-3">
        <ScoreInput name="home" value={home} onChange={setHome} aria-label={`Goles ${homeTeam}`} />
        <span className="text-lg font-bold text-slate-500">:</span>
        <ScoreInput name="away" value={away} onChange={setAway} aria-label={`Goles ${awayTeam}`} />

        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="ml-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {pending ? "…" : "Guardar"}
        </button>
      </div>

      {needsWinner && (
        <div className="mt-3">
          <p className="mb-1.5 text-center text-xs font-medium text-violet-300">
            Empate: ¿quién avanza? (penales)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <WinnerButton selected={winner === "a"} onClick={() => setWinner("a")}>
              {homeTeam}
            </WinnerButton>
            <WinnerButton selected={winner === "b"} onClick={() => setWinner("b")}>
              {awayTeam}
            </WinnerButton>
          </div>
        </div>
      )}

      {state.error && <p className="mt-2 text-center text-xs text-red-300">{state.error}</p>}
      {justSaved && (
        <p className="mt-2 text-center text-xs font-medium text-emerald-300">
          ✓ Predicción guardada
        </p>
      )}
    </form>
  );
}

function WinnerButton({
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
          ? "border-violet-400 bg-violet-400/15 text-violet-200"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function ScoreInput({
  name,
  value,
  onChange,
  ...rest
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange">) {
  return (
    <input
      {...rest}
      name={name}
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      className="h-14 w-14 rounded-xl border border-white/15 bg-white/5 text-center text-2xl font-bold text-white outline-none focus:border-emerald-400"
    />
  );
}
