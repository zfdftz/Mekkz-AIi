# Deployment Anleitung

## Vercel (empfohlen)
1. Repository zu GitHub pushen.
2. In Vercel importieren.
3. Environment Variables setzen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` oder `ANTHROPIC_API_KEY`
   - `AI_PROVIDER`
4. Build Command: `npm run build`
5. Output: Next.js Standard

## Supabase Setup
1. Neues Supabase Projekt erstellen.
2. SQL aus `supabase/schema.sql` ausfuehren.
3. Auth (Email/Password) aktivieren.
4. Keys in Vercel bzw. `.env.local` eintragen.
