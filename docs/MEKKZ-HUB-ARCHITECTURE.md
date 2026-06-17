# Mekkz Hub — Architecture Overview

Mekkz Hub extends Mekkz AI into a unified workspace without removing classic routes (`/chat`, `/community`, `/tools`).

## Layout Modes

| Mode | Route | Toggle |
|------|-------|--------|
| **Mekkz Hub** (default) | `/hub` | Settings → Layout → Mekkz Hub |
| **Classic** | `/chat` | Settings → Layout → Classic |

Preference is stored in `localStorage` + cookie `mekkz_layout`.

## UI Structure (`/hub`)

```
┌─────────────┬──────────────────────┬─────────────┐
│ LEFT        │ CENTER               │ RIGHT       │
│ Chats       │ AI Chat (ChatUI)     │ Files       │
│ Pinned      │ Voice, Tools input   │ Tasks       │
│ Workspaces  │                      │ Calendar    │
│ Projects    │                      │ Notes       │
│ Search      │                      │ Reminders   │
├─────────────┴──────────────────────┴─────────────┤
│ BOTTOM: Feed · Friends · Groups · Notifications  │
└──────────────────────────────────────────────────┘
```

## Database

Run `supabase/migration-mekkz-hub.sql` in Supabase.

## Reverting to Classic

Settings → Layout → Classic, or open `/chat` directly.
