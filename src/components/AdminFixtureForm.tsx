"use client";

import { useActionState } from "react";
import { saveFixtureAction, type AdminState } from "@/app/actions/admin";
import { teamFlag } from "@/lib/teams";
import { teamsTBD } from "@/lib/format";
import type { Match } from "@/lib/types";

const initial: AdminState = { error: null, ok: false };

export function AdminFixtureForm({ match }: { match: Match }) {
  const [state, action, pending] = useActionState(saveFixtureAction, initial);
  const tbd = teamsTBD(match);

  return (
    <details className="mt-2 rounded-lg border border-white/10 bg-slate-950/40" open={tbd}>
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-slate-300">
        ✏️ {tbd ? "Asignar equipos / fecha" : "Editar equipos / fecha"}
      </summary>
      <form action={action} className="space-y-2 px-3 pb-3">
        <input type="hidden" name="matchId" value={match.id} />

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-400">
            Equipo local {teamFlag(match.home_team)}
            <input
              name="home_team"
              defaultValue={tbd ? "" : match.home_team}
              placeholder="Ej. Colombia"
              className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="text-[11px] text-slate-400">
            Equipo visitante {teamFlag(match.away_team)}
            <input
              name="away_team"
              defaultValue={tbd ? "" : match.away_team}
              placeholder="Ej. Brasil"
              className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-400">
            Fecha
            <input
              name="match_date"
              type="date"
              defaultValue={match.match_date}
              className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="text-[11px] text-slate-400">
            Hora (Colombia)
            <input
              name="match_time"
              type="time"
              defaultValue={match.match_time.slice(0, 5)}
              className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>

        <label className="block text-[11px] text-slate-400">
          Sede (opcional)
          <input
            name="venue"
            defaultValue={match.venue ?? ""}
            placeholder="Ciudad - Estadio"
            className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar llave"}
        </button>

        {state.error && <p className="text-center text-xs text-red-300">{state.error}</p>}
        {state.message && !state.error && (
          <p className="text-center text-xs font-medium text-emerald-300">{state.message}</p>
        )}
      </form>
    </details>
  );
}
