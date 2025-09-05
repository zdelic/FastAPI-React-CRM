// src/components/ProjectUsersCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getUsers, type User } from "../api/users";
import {
  getProjectUsers, addUserToProject, removeUserFromProject
} from "../api/project";
import { UserPlus, UserMinus, Search, Users } from "lucide-react";

type Props = { projectId: number };

export default function ProjectUsersCard({ projectId }: Props) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assigned, setAssigned] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [users, projectUsers] = await Promise.all([getUsers(), getProjectUsers(projectId)]);
      setAllUsers(users);
      setAssigned(projectUsers);
    })();
  }, [projectId]);

  const assignedIds = new Set(assigned.map(u => u.id));
  const unassigned = useMemo(
    () => allUsers.filter(u => !assignedIds.has(u.id)),
    [allUsers, assignedIds]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return unassigned;
    return unassigned.filter(u =>
      (u.name || "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [unassigned, query]);

  async function add(u: User) {
    setAddingId(u.id);
    try {
      const added = await addUserToProject(projectId, u.id);
      setAssigned(prev => [...prev, added]);
    } finally {
      setAddingId(null);
    }
  }

  async function remove(u: User) {
    await removeUserFromProject(projectId, u.id);
    setAssigned(prev => prev.filter(x => x.id !== u.id));
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-slate-700 to-gray-900 backdrop-blur shadow-md overflow-hidden mt-7">
      {/* Header s ikonicom */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Users size={18} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-slate-100">Projekt-Mitglieder</div>
            <div className="text-xs text-slate-400">
              {assigned.length} Mitglied{assigned.length === 1 ? "" : "er"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Zugeordnet (bez bordera, “flat” kartice) */}
        <div>
          <div className="px-1 pb-2 text-sm font-medium text-slate-200">Zugeordnet</div>

          {assigned.length === 0 ? (
            <div className="px-1 py-3 text-sm text-slate-400">Noch keine Mitglieder.</div>
          ) : (
            <ul className="space-y-2 max-h-[300px] overflow-y-auto">
              {assigned.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/50 px-3 py-2.5 hover:bg-slate-800/70 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-700/60 text-slate-100 flex items-center justify-center">
                      {(u.name?.[0] || u.email[0]).toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <div className="text-sm font-medium text-slate-100">{u.name || "—"}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => remove(u)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
                    title="Entfernen"
                  >
                    <UserMinus size={16} />
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hinzufügen (flat) */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-200">Benutzer hinzufügen</div>
            <div className="relative w-64 max-w-full">
              <Search
                size={16}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="w-full rounded-lg bg-slate-900/70 border-none pl-8 pr-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Suche nach Name / E-Mail…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <ul className="space-y-2 max-h-[280px] overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-1 py-3 text-sm text-slate-400">Keine Treffer.</li>
            ) : (
              filtered.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/50 px-3 py-2.5 hover:bg-slate-800/70 transition"
                >
                  <div className="leading-tight">
                    <div className="text-sm font-medium text-slate-100">{u.name || "—"}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                  <button
                    onClick={() => add(u)}
                    disabled={addingId === u.id}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    title="Hinzufügen"
                  >
                    <UserPlus size={16} />
                    Hinzufügen
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>



  );
}
