"use client";

import { Shield, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyState,
  ErrorBanner,
  FieldLabel,
  LoadingState,
  Panel,
  PrimaryButton,
  TextArea,
  TextInput
} from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";
import type { Clan, ClanMember } from "@/lib/community/types";

export function ClansTab() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/community/clans");
      const data = await readJsonResponse<{
        clans?: Clan[];
        myClan?: Clan | null;
        members?: ClanMember[];
      }>(res);
      if (!res.ok) throw new Error("Clans konnten nicht geladen werden.");
      setClans(data.clans ?? []);
      setMyClan(data.myClan ?? null);
      setMembers(data.members ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createClan() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/community/clans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: name.trim(), description, isPublic: true })
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Clan konnte nicht erstellt werden.");
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setCreating(false);
    }
  }

  async function joinClan(clanId: string) {
    const res = await fetch("/api/community/clans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", clanId })
    });
    const data = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) setError(data.error || "Beitritt fehlgeschlagen.");
    else await load();
  }

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ErrorBanner message={error} />

      {myClan ? (
        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            <h3 className="text-lg font-semibold">{myClan.name}</h3>
          </div>
          <p className="mb-3 text-sm text-muted">{myClan.description || "Keine Beschreibung."}</p>
          <p className="mb-2 text-xs text-primary">{myClan.memberCount} Mitglieder</p>
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.userId} className="flex justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
                <span>@{m.username ?? "user"}</span>
                <span className="text-xs capitalize text-muted">{m.role}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel>
          <h3 className="mb-3 font-semibold">Clan gründen</h3>
          <FieldLabel>Name</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Clan Name" />
          <FieldLabel>Beschreibung</FieldLabel>
          <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <PrimaryButton className="mt-3 w-full season-btn" loading={creating} onClick={() => void createClan()}>
            Clan erstellen
          </PrimaryButton>
        </Panel>
      )}

      <Panel>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Users size={16} /> Öffentliche Clans
        </h3>
        {clans.length === 0 ? (
          <EmptyState>Noch keine Clans — gründe den ersten!</EmptyState>
        ) : (
          <div className="space-y-2">
            {clans.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted">{c.memberCount} Mitglieder</p>
                </div>
                {!myClan ? (
                  <PrimaryButton className="season-btn px-3 py-1 text-xs" onClick={() => void joinClan(c.id)}>
                    Beitreten
                  </PrimaryButton>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
