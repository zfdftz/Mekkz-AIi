"use client";

import { Check, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyState,
  ErrorBanner,
  FieldLabel,
  GhostButton,
  LoadingState,
  Panel,
  PrimaryButton,
  TextArea,
  TextInput
} from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";
import type { TaskItem } from "@/lib/community/types";

const PRIORITY_COLORS = {
  low: "text-sky-300",
  medium: "text-amber-300",
  high: "text-red-300"
};

export function TasksTab() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [title, setTitle] = useState("");
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/productivity?resource=tasks");
      const data = await readJsonResponse<{ tasks?: TaskItem[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Tasks konnten nicht geladen werden.");
      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveTask(partial: Partial<TaskItem> & { title: string }) {
    setBusy(true);
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "tasks", action: "upsert", payload: partial })
      });
      const data = await readJsonResponse<{ tasks?: TaskItem[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen.");
      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setBusy(false);
    }
  }

  async function addTask() {
    if (!title.trim()) return;
    await saveTask({ title: title.trim(), priority: "medium", status: "todo" });
    setTitle("");
  }

  async function generateTasks() {
    if (!aiText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "tasks", action: "generate", payload: { text: aiText } })
      });
      const data = await readJsonResponse<{ tasks?: TaskItem[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "KI-Generierung fehlgeschlagen.");
      setTasks(data.tasks ?? []);
      setAiText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTask(id: string) {
    setBusy(true);
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "tasks", action: "delete", payload: { id } })
    });
    const data = await readJsonResponse<{ tasks?: TaskItem[] }>(res);
    if (res.ok) setTasks(data.tasks ?? []);
    setBusy(false);
  }

  const columns: TaskItem["status"][] = ["todo", "in_progress", "done"];

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <GhostButton className={view === "kanban" ? "border-primary/40 bg-primary/15" : ""} onClick={() => setView("kanban")}>
          Kanban
        </GhostButton>
        <GhostButton className={view === "list" ? "border-primary/40 bg-primary/15" : ""} onClick={() => setView("list")}>
          Liste
        </GhostButton>
      </div>

      <Panel>
        <FieldLabel>Neue Aufgabe</FieldLabel>
        <div className="flex gap-2">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel…" />
          <PrimaryButton loading={busy} onClick={addTask}>
            Hinzufügen
          </PrimaryButton>
        </div>
        <div className="mt-3">
          <FieldLabel>KI aus Text generieren</FieldLabel>
          <TextArea rows={2} value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="z.B. Projektplan für Website…" />
          <PrimaryButton className="mt-2" loading={busy} onClick={generateTasks}>
            <Sparkles size={14} className="mr-1 inline" /> KI Tasks
          </PrimaryButton>
        </div>
      </Panel>

      <ErrorBanner message={error} />

      {tasks.length === 0 ? (
        <EmptyState>Keine Aufgaben.</EmptyState>
      ) : view === "kanban" ? (
        <div className="grid gap-3 md:grid-cols-3">
          {columns.map((status) => (
            <Panel key={status}>
              <h4 className="mb-2 text-sm font-semibold uppercase text-muted">{status.replace("_", " ")}</h4>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      busy={busy}
                      onSave={saveTask}
                      onDelete={deleteTask}
                    />
                  ))}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} busy={busy} onSave={saveTask} onDelete={deleteTask} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  busy,
  onSave,
  onDelete
}: {
  task: TaskItem;
  busy: boolean;
  onSave: (t: Partial<TaskItem> & { title: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`font-medium ${task.status === "done" ? "line-through opacity-60" : ""}`}>{task.title}</p>
          {task.dueAt ? (
            <p className="mt-1 text-xs text-muted">Fällig: {new Date(task.dueAt).toLocaleString()}</p>
          ) : null}
        </div>
        <span className={`text-xs uppercase ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(["todo", "in_progress", "done"] as const).map((status) => (
          <GhostButton
            key={status}
            disabled={busy}
            className={task.status === status ? "border-primary/40 bg-primary/15" : ""}
            onClick={() => onSave({ ...task, status })}
          >
            {status === "done" ? <Check size={12} /> : null} {status}
          </GhostButton>
        ))}
        <GhostButton disabled={busy} onClick={() => onDelete(task.id)}>
          <Trash2 size={12} />
        </GhostButton>
      </div>
    </div>
  );
}

export function CalendarTab() {
  const [events, setEvents] = useState<
    Array<{ id: string; title: string; startsAt: string; endsAt: string; description: string }>
  >([]);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/productivity?resource=calendar");
    const data = await readJsonResponse<{ events?: typeof events }>(res);
    if (res.ok) setEvents(data.events ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addEvent() {
    if (!title.trim() || !startsAt || !endsAt) return;
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "calendar",
        action: "upsert",
        payload: { title, startsAt, endsAt, description: "" }
      })
    });
    const data = await readJsonResponse<{ events?: typeof events; error?: string }>(res);
    if (!res.ok) setError(data.error || "Fehler.");
    else {
      setEvents(data.events ?? []);
      setTitle("");
      setStartsAt("");
      setEndsAt("");
    }
  }

  const now = new Date();
  const monthLabel = now.toLocaleString("de-DE", { month: "long", year: "numeric" });

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Panel>
        <h3 className="mb-3 font-semibold capitalize">{monthLabel}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <FieldLabel>Titel</FieldLabel>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Start</FieldLabel>
            <TextInput type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Ende</FieldLabel>
            <TextInput type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <PrimaryButton className="mt-3" onClick={addEvent}>
          Termin hinzufügen
        </PrimaryButton>
      </Panel>
      <ErrorBanner message={error} />
      {events.length === 0 ? (
        <EmptyState>Keine Termine.</EmptyState>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <Panel key={ev.id}>
              <p className="font-medium">{ev.title}</p>
              <p className="text-xs text-muted">
                {new Date(ev.startsAt).toLocaleString()} – {new Date(ev.endsAt).toLocaleString()}
              </p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

export function RemindersTab() {
  const [reminders, setReminders] = useState<
    Array<{ id: string; title: string; remindAt: string; recurrence?: string | null; isDone: boolean }>
  >([]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/productivity?resource=reminders");
    const data = await readJsonResponse<{ reminders?: typeof reminders }>(res);
    if (res.ok) setReminders(data.reminders ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function parseText() {
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "reminders", action: "parse", payload: { text } })
    });
    const data = await readJsonResponse<{ parsed?: { title: string; remindAt: string; recurrence?: string } }>(res);
    if (data.parsed) {
      setTitle(data.parsed.title);
      setRemindAt(data.parsed.remindAt.slice(0, 16));
      setRecurrence(data.parsed.recurrence ?? "");
    }
  }

  async function save() {
    if (!title.trim() || !remindAt) return;
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "reminders",
        action: "upsert",
        payload: { title, remindAt: new Date(remindAt).toISOString(), recurrence: recurrence || null }
      })
    });
    const data = await readJsonResponse<{ reminders?: typeof reminders; error?: string }>(res);
    if (!res.ok) setError(data.error || "Fehler.");
    else {
      setReminders(data.reminders ?? []);
      setText("");
      setTitle("");
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Panel>
        <FieldLabel>Natürliche Sprache</FieldLabel>
        <TextArea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='z.B. "Erinnere mich morgen um 10 Uhr an Meeting"'
        />
        <GhostButton className="mt-2" onClick={parseText}>
          KI parsen
        </GhostButton>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
          <TextInput type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
          <TextInput
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            placeholder="Wiederholung: daily, weekly…"
          />
        </div>
        <PrimaryButton className="mt-3" onClick={save}>
          Reminder speichern
        </PrimaryButton>
      </Panel>
      <ErrorBanner message={error} />
      {reminders.length === 0 ? (
        <EmptyState>Keine Reminder.</EmptyState>
      ) : (
        reminders.map((r) => (
          <Panel key={r.id} className={r.isDone ? "opacity-50" : ""}>
            <p className="font-medium">{r.title}</p>
            <p className="text-xs text-muted">{new Date(r.remindAt).toLocaleString()}</p>
            {r.recurrence ? <p className="text-xs text-primary">↻ {r.recurrence}</p> : null}
          </Panel>
        ))
      )}
    </div>
  );
}

export function NotesTab() {
  const [notes, setNotes] = useState<
    Array<{ id: string; title: string; content: string; updatedAt: string }>
  >([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<(typeof notes)[0] | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = search.trim() ? `&q=${encodeURIComponent(search.trim())}` : "";
    const res = await fetch(`/api/productivity?resource=notes${params}`);
    const data = await readJsonResponse<{ notes?: typeof notes }>(res);
    if (res.ok) setNotes(data.notes ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveNote() {
    if (!active) return;
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "notes",
        action: "upsert",
        payload: active
      })
    });
    const data = await readJsonResponse<{ notes?: typeof notes }>(res);
    if (res.ok) setNotes(data.notes ?? []);
  }

  async function summarize() {
    if (!active?.content) return;
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "notes", action: "summarize", payload: { content: active.content } })
    });
    const data = await readJsonResponse<{ summary?: string }>(res);
    setSummary(data.summary ?? null);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Panel>
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen…" />
        <PrimaryButton
          className="mt-2 w-full"
          onClick={() =>
            setActive({ id: "", title: "Neue Notiz", content: "", updatedAt: new Date().toISOString() })
          }
        >
          + Notiz
        </PrimaryButton>
        <div className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => {
                setActive(note);
                setSummary(null);
              }}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                active?.id === note.id ? "bg-primary/20" : "hover:bg-white/10"
              }`}
            >
              {note.title}
            </button>
          ))}
        </div>
      </Panel>
      <Panel>
        {!active ? (
          <EmptyState>Notiz auswählen oder erstellen.</EmptyState>
        ) : (
          <>
            <TextInput
              value={active.title}
              onChange={(e) => setActive({ ...active, title: e.target.value })}
              className="mb-2 font-medium"
            />
            <TextArea
              rows={12}
              value={active.content}
              onChange={(e) => setActive({ ...active, content: e.target.value })}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <PrimaryButton onClick={saveNote}>Speichern</PrimaryButton>
              <GhostButton onClick={summarize}>KI zusammenfassen</GhostButton>
            </div>
            {summary ? (
              <div className="mt-3 rounded-xl bg-primary/10 p-3 text-sm">{summary}</div>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}
