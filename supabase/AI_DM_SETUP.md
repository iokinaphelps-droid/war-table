# Switching on the AI Dungeon Master

The AI DM is a DigitalOcean Function (`packages/wartable/dm`). It only lights up once the function has an LLM key.
The key never goes in the code — it lives in the App Platform environment.

1. Get an Anthropic API key: https://console.anthropic.com → API Keys → Create key. Put a spending limit on it (Settings → Limits), e.g. $20/month.
2. DigitalOcean → Apps → **wontonvtt** → Settings → component **api** (the Functions component) → **Environment Variables** → Edit → add:
   - `ANTHROPIC_API_KEY` = your key  (tick **Encrypt**)
   - `SUPABASE_URL` = `https://tocngduvalglawxycaal.supabase.co`
   - `SUPABASE_ANON_KEY` = the publishable key from Supabase → Project Settings → API (the same one the site uses)
   - optional `DM_MODEL` = `claude-sonnet-4-5` (default) or `claude-haiku-4-5` for cheaper play
   - optional `DM_ALLOWED_EMAILS` = comma-separated emails allowed to use the DM (leave unset = anyone signed in to War Table)
3. Save — the app redeploys. In War Table: Campaigns → New campaign → tick **AI Dungeon Master**, give a premise, pick difficulty/tone/length → Start session → **Begin the campaign**.

Rough cost: a 2-hour session is ~40 DM replies ≈ $0.50–2 on Sonnet, well under $0.50 on Haiku.
