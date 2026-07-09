import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMatches } from "@/lib/queries";
import {
  effectiveState,
  dayKey,
  dayLabel,
  isKnockout,
  teamsTBD,
  KNOCKOUT_ROUNDS,
} from "@/lib/format";
import { AdminResultForm } from "@/components/AdminResultForm";
import { AdminFixtureForm } from "@/components/AdminFixtureForm";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

type Vista = "por-cargar" | "fases-finales" | "calculados" | "todos";

const VISTAS: { key: Vista; label: string }[] = [
  { key: "por-cargar", label: "Por cargar" },
  { key: "fases-finales", label: "Fases finales" },
  { key: "calculados", label: "Calculados" },
  { key: "todos", label: "Todos" },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");

  const { vista: rawVista } = await searchParams;
  const vista = (VISTAS.find((v) => v.key === rawVista)?.key ?? "por-cargar") as Vista;

  const matches = await getMatches();

  const pendientes = matches.filter(
    (m) => !m.points_calculated && effectiveState(m) === "locked"
  ).length;

  // Vista especial: fases finales (agrupada por ronda, con editor de llaves).
  if (vista === "fases-finales") {
    const knockout = matches.filter((m) => isKnockout(m.group_name));
    const byRound = new Map<string, Match[]>();
    for (const m of knockout) {
      if (!byRound.has(m.group_name)) byRound.set(m.group_name, []);
      byRound.get(m.group_name)!.push(m);
    }
    const orderedRounds = KNOCKOUT_ROUNDS.filter((r) => byRound.has(r));

    return (
      <div className="space-y-5">
        <Header pendientes={pendientes} vista={vista} />
        <ViewTabs vista={vista} pendientes={pendientes} />

        {knockout.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
            Aún no hay partidos de fases finales cargados.
          </div>
        ) : (
          <>
            <p className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-200">
              Asigna los equipos de cada llave a medida que se definan. Apenas guardes
              los equipos, el partido se abre para que todos pronostiquen.
            </p>
            {orderedRounds.map((round) => (
              <section key={round} className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-violet-300">
                  {round}
                </h2>
                {byRound.get(round)!.map((m) => (
                  <article
                    key={m.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium">#{m.match_number}</span>
                      <span>{dayLabel(m.kickoff_at)}</span>
                    </div>
                    <p className="mt-1 text-center text-sm font-bold">
                      {m.home_team} <span className="text-slate-500">vs</span> {m.away_team}
                    </p>
                    <AdminFixtureForm match={m} />
                    {!teamsTBD(m) && <div className="mt-3"><AdminResultForm match={m} /></div>}
                  </article>
                ))}
              </section>
            ))}
          </>
        )}
      </div>
    );
  }

  // Vistas normales (por día).
  const filtered = matches.filter((m) => {
    switch (vista) {
      case "por-cargar":
        return !m.points_calculated && effectiveState(m) === "locked";
      case "calculados":
        return m.points_calculated;
      default:
        return true;
    }
  });

  const groups = new Map<string, Match[]>();
  for (const m of filtered) {
    const k = dayKey(m.kickoff_at);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(m);
  }

  return (
    <div className="space-y-5">
      <Header pendientes={pendientes} vista={vista} />
      <ViewTabs vista={vista} pendientes={pendientes} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
          {vista === "por-cargar"
            ? "🎉 No hay partidos pendientes por cargar."
            : "No hay partidos en esta vista."}
        </div>
      ) : (
        [...groups.entries()].map(([k, ms]) => (
          <section key={k} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {dayLabel(ms[0].kickoff_at)}
            </h2>
            {ms.map((m) => (
              <AdminResultForm key={m.id} match={m} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function Header({ pendientes, vista }: { pendientes: number; vista: Vista }) {
  return (
    <>
      <div>
        <h1 className="text-2xl font-black">Panel Admin ⚙️</h1>
        <p className="text-sm text-slate-400">
          Actualiza resultados reales y calcula los puntos.
        </p>
      </div>
      {pendientes > 0 && vista !== "por-cargar" && (
        <Link
          href="/admin?vista=por-cargar"
          className="block rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200"
        >
          ⏰ {pendientes} partido(s) esperan resultado.
        </Link>
      )}
    </>
  );
}

function ViewTabs({ vista, pendientes }: { vista: Vista; pendientes: number }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {VISTAS.map((v) => (
        <Link
          key={v.key}
          href={`/admin?vista=${v.key}`}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            vista === v.key
              ? "bg-emerald-500 text-slate-950"
              : "border border-white/10 bg-white/5 text-slate-300"
          }`}
        >
          {v.label}
          {v.key === "por-cargar" && pendientes > 0 ? ` (${pendientes})` : ""}
        </Link>
      ))}
    </div>
  );
}
