# War Table — Build Log & Decisions

A living record for the D&D party companion we're building. Kept deliberately light — this is a fun project, not a compliance tool. Most-recent decisions at the bottom of each section.

**LIVE SITE: https://wontonvtt.app** — DigitalOcean App Platform, auto-deploys from GitHub `main`. **Table view:** https://wontonvtt.app/#table. **Feedback form:** https://wontonvtt.app/feedback.html. **Player Guide:** Claude Doc "War Table — Player Guide" (artifact EVAnXxrbJ2YwQy1CycaW61). Old Netlify site still exists; client no longer uses it — owner deletes it after a week on DO.

---

## The vision
A D&D Beyond-style companion for Turtle's party: build and run characters, fight battles, track map + story — friendly to the DM's homebrew. Destiny-style flow: save-slots per campaign → host picks one → party joins a lobby → host Starts → host Ends. **Players are on phones.** **Visual identity: dark-fantasy**, four themes. Shared with friends & family from v19 — feedback drives the roadmap. From v22 a campaign can also be run by an **AI Dungeon Master** (for other campaigns, warm-ups with the girlfriend, quick tests).

## SOURCE OF TRUTH — the four original character apps
The party's canonical character data lives in four earlier published artifacts. **PORT from these — never re-author from memory.** Saved under `scratchpad/orig/<name>/index.html`.
- **Aster Phagos** — Warlock 10 — `KscfJ2hRAh4v7zUKqnhMJd` — 35 moves + 21 passives.
- **Vernig Bloomspice** — Druid 15 — `9joGiniwKYxP5akxYKrj1i` — 134 + 9.
- **Valin Grey** — Ranger 12 — `33gJQ56bAN1vDzxkRRwjSy` — 10 + 18.
- **Blane the Weilder** — Fighter 13 — `LHbmgudDGQkcgtnDAAddib` — 6 + 21.
Moves → `scratchpad/port.js`; passives/items → `scratchpad/port2.js`.

## D&D Beyond is the source of truth for level & stats
`ddbId` characters auto-refresh on sign-in, session start, every 2 min, tab return, Sheet open (45 s floor), ⟳. **DDB wins:** scores, level, prof, saves, passives, speed, spell stats, class, DDB-tagged abilities. **War Table wins:** HP, AC, items/inventory, charges, slots, companions, portrait, color/token/role, custom abilities. The importer carries features/feats/spells with their text from any book the owner has on DDB (PHB content comes through; the on-site builder stays SRD-only).

## The DM seat (v19)
Gold **DM card** in the lobby; Start works with an empty party. DM-owned PCs/NPCs ride on `camp.settings.dmParty`; `syncDmParty` folds them into `camp.party`. `npc:true` on characters. `supabase/dm_characters.sql` adds the read policy (run ✅).

## AI Dungeon Master (v22–v23)
- **Server:** DO Function `packages/wartable/dm` (in `project.yml`, timeout 60 s). Env on the function component: `ANTHROPIC_API_KEY` (encrypted), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, optional `DM_MODEL` (default `claude-sonnet-4-5`), `DM_ALLOWED_EMAILS`. **DO Functions only receive env vars that `project.yml` maps in an `environment:` block (`${VAR}`)** — component-level vars alone are not injected; unset `${VAR}` references can fail the build. Verifies the caller's Supabase JWT via `/auth/v1/user`. **Always answers 200 with `{text}` or `{error}`** — App Platform replaces 5xx bodies with its own page. Live since 2026-10-12.
- **Client:** `camp.settings.ai {on,premise,difficulty,tone,length,bible,scene,pendingRolls}` (owner-written). The **Story** tab (`storyView`) is a shared thread of journal rows `kind:"ai"`. `AI_UI` keeps the draft, cursor, chosen character and scroll position across re-renders (`aiSnapshotUI` in `render()`); jumps to bottom only when the thread grows. `aiSystem` builds the prompt: tone, difficulty, premise, pacing, calendar, `partySummary`, the hidden **bible**, **live board state** (`aiBoardState`: size, feet/tile, walls, every token's position/HP), table rules, and the **command format**: ```wt JSON with `roll / encounter / npc / handout / calendar / rest / bible / scene / xp / map / move`.
- **Map & move (v23):** `map {name,prompt,cols,rows,walls:[[x,y]]}` → `aiApplyMap` sizes the active room (or the campaign map), sets `b.walls`, then `aiGenMap` paints a top-down image via Pollinations (flux→turbo, 1024px) into `b.bg`. `move [{who,to:[x,y]}|{who,near}]` → `aiApplyMoves` repositions any token (party included), bumping to the nearest free tile; logged. Walls (`isWall`) block `attemptMove`, enemy pathing and spawns; rendered as dark tiles.
- **Rolls / encounters / enemy turns / finish:** unchanged from v22 (owner's client runs monsters by difficulty; `[combat won|lost]` summary back to the DM).

## Scaling, class kits, items, saves, reactions (v24–v25)
- **Scaling engine:** `a.upcast` (dice by slot level, from SRD `damage_at_slot_level`), `a.upcastPer`, `a.scale {res:"slot"|chargeKey, base, per, min, max, pool}`, `a.rider` (on-hit; doesn't end the turn), `a.heal`/`a.healUp` (`MOD`/`L` substituted), `a.apply {cond, rounds, target, actionSurge, tempHP, halveLast, acBonus, dash}`, rider `save`+`cond`+`condRounds`. `scaleInfo/effAbility/scaleBlock/spendScaled`; stepper state `st.lvl` lives in `CALC[id]` (sheet) / `BACT` (battle). `spendCharge(ch,res,n)` spends N.
- **`classKit(ch)`** runs on build, DDB import/resync and boot: every SRD class's resources and mechanics — Rage (+dmg in `computeTotal`, B/P/S resistance in `defenseFor`, ends without attack/damage), Reckless, Bardic Inspiration, Cutting Words, Channel Divinity/Turn Undead/Preserve Life, Wild Shape, Second Wind (heal)/Action Surge (`actionSurge`)/Indomitable, Ki + Unarmed/Martial Arts/Flurry/Patient Defense/Step of the Wind/Stunning Strike (rider + CON save → Stunned), Lay on Hands (pool)/Divine Smite (rider, slot-scaled)/Sacred Weapon, Sneak Attack (rider)/Uncanny Dodge (`halveLast`), Sorcery Points (pool), Arcane Recovery, Hunter's Mark & Hex rider siblings, Dark One's Blessing (`tempHP`), Champion `critMin` 19/18. Upgrades DDB text-only features in place (`put`). Spells by name: Shield → reaction `acBonus:5`; `HEAL_SPELLS` give `heal`/`healUp`. Half-caster slots fixed (`ceil(L/2)`, none at L1).
- **Battle panel:** standard-action chips (Dodge/Dash/Disengage/Help/Hide/Grapple; Cunning Action bonus variants for rogues), conditions `Dodging/Disengaged/Helped/Reckless/Raging/Inspired/Shielded/…` (`TURN_CONDS` clear at the creature's next turn), `c.extraMove` (Dash), `Helped` consumed on the next attack roll.
- **Items:** `itemUse(it)` — potions of healing auto-detected (`POTIONS`); ⚗ on an inventory row opens `itemEffectModal` → `it.use {kind heal|temp|damage|cond|other, dice, type, save, cond, rounds, target, action, consume}`. 🎒 Items filter in the move grid (`itemGrid`); use rolls, applies, consumes qty, costs the chosen action.
- **Saves:** `saveBlock` on every player's panel, on- and off-turn (`data-bsave`; Dodging → DEX adv, Raging → STR adv; a roll satisfies a matching pending save). DM **Call for a save** (`callSaveModal`) → `b.pending {auto:true, half}`; `pendingPanel` shows players their own rows to roll (`viewerCombatants`), `pendingAutoApply` applies damage when `auto`/`autoSaves`; DM keeps Full/Half/None.
- **Reactions:** `reactionModal` → `data-reactgo` sets `BACT.react` (opportunity attack = first melee weapon ability; any reaction ability); `turnActionPanel` renders the reactor's own panel above the waiting notice; attack / save-based / heal / apply flows end with "reaction used" instead of `advanceTurn`. Hellish Rebuke works as a save-based reaction.
- Tests: `scratchpad/pw/smite.py`, `combat.py`, `aimap.py`, `draft.py` (+ the earlier suite).

## Table tools & table-side mode (v26)
- **Research basis:** per-VTT user praise/complaints (Roll20, Foundry, Owlbear, FG, DDB Maps, AboveVTT, Alchemy, Talespire, Shard, Kanka/WA). Users reward zero-friction join, one-click monsters, working fog, portable data, rule toggles; unfilled niches: downtime/economy, factions, travel/weather, in-person phone play. War Table already had fog, calendar, passives, dice, prepared limits, attunement cap.
- **Table chat (💬):** journal kind `chat`, `meta {from,to:user|"dm"|null,secret,roll,check}`; `chatRows` filters visibility client-side (RLS lets members read all journal rows — whispers are UI-private like NPC secrets); unread badge via localStorage `wt_chatseen_*`; dice drawer posts rolls (table / whisper DM / secret). **Ask for a check:** `askCheckModal` → `meta.check {skill|ability,dc,group,showDC,targets,results}`; targets roll with `skillBonus(ch,name)` (ch.skills is a list of proficient names); group verdict ≥ half. Also on the DM battle panel.
- **Spell preparation:** `prepClassOf/prepLimit/spellPrepared/preparedCount`; `a.prepared===false` hides it from the battle grid; toggle on sheet cards; "Prepared" filter.
- **Encounter budget:** `CR_XP`, `XP_THRESH`, `encounterBudget` (DMG 2014 multipliers by count and party size); shown in the opponent picker and the DM battle bar; `endRoom` logs XP of slain foes.
- **DM screen:** `loot` (DMG-style individual/hoard by CR tier, post as handout) and `tables` (`BUILTIN_TABLES` + `settings.tables`; results to the DM log). **Calendar:** travel (`TRAVEL_PACE`, advances date, logs) + weather roll (`calendar.weather`).
- **Lore kinds** `faction` (meta `{rep,notes,secret}`, ±, rep bar) and `shop` (meta `{where,notes,items[{name,price,stock,note}]}`; `payGold` breaks coins; buying adds to the bag and logs).
- **Export/import:** `downloadJSON`, `exportCharacter`, `exportCampaign`, `importFile` (`.wartable.json` with `wartable:"character"|"campaign"` or a whole save); ⬇ on sheet header, campaign cards and the Profile export modal.
- **Table-side mode:** `settings.tableSide` (new-campaign checkbox) → `isLive()` always true, `tableHost` gives every member board/battle authority, `canAct` lets anyone run foes; `tableSidePlay(chId)` makes/reuses a personal `solo` table-side campaign from a character card. Target-less attacks: `data-blogdmg` "Call it" logs the number, spends resources, ends the turn.
- Tests: `tabletools.py`, `tableside.py`.

## Builder (v19–v20)
`newWiz/wizSteps/wizStep/wizFinalize/wizMergeInto`. dnd5eapi.co via `D5E.get` (cached; 301 to `/api/2014/`). Races+subraces merged with extras. Multiclass (`wiz.extra[]`), PHB slot table, per-class spell limits. ASIs or feats (`FEATS`). Gear → AC/attacks/inventory. Level-up via `ch.build` + `wizMergeInto`. Offline fallback. Spells import `upcast` / `healUp` tables.

## Sheet extras
Inventory & currency (+ ⚗ battle use); printable sheet; ⓘ read-more (SRD full text); **companions (v22):** `kind`, persistent `hp`, `charges` tied to moves, portrait. Sheet cards show "Scales" and "Heals" lines; heal abilities have a "Heal me" button; pool abilities a Spend field.

## The stack
- `index.html` + `feedback.html`; DO App Platform (static `/`, Functions `/api`: `ddb`, `dm`); `wontonvtt.app` via Porkbun; Supabase `tocngduvalglawxycaal` (Postgres/Auth/Realtime/Storage); SRD from dnd5eapi.co; Pollinations portraits & battle maps. SQL in `supabase/`: `upgrade_v18.sql` ✅, `feedback.sql` ✅, `dm_characters.sql` ✅. Cost: $0 + domain + LLM usage when the AI DM is on.

## Realtime — READ THIS before touching sync
`postgres_changes` **only delivers UPDATE/DELETE on RLS tables with `REPLICA IDENTITY FULL`** — all synced tables have it. `Cloud.afterRender` 400 ms, `Cloud.syncRooms` 90 ms (hash-diffed; any `render()` persists battle changes). `Cloud.feat` probed at load. `Cloud.resync()` on tab return >45 s / `online`.

## Core law
Characters → owner; campaign (map, bestiary, settings) → DM/owner; membership → member; lore/journal → author (DM may edit). Battle rooms shared. Control follows ownership.

## Battle
Feet-scaled board, grid/free, drag tokens, zoom/pinch, campaign map as battlefield, wall tiles, revive-on-tile rule, conditions with auto adv/dis, to-hit + crits, save targeting with AoE templates, DM Resolve / auto-saves / player-rolled saves, SRD monsters + 📖, Table view (`#table`). **Automation (v21):** damage pipeline (resist/immune/vuln → temp HP → HP), concentration checks, undo, action economy pips, timed effects with round countdown. **v25:** standard actions, items, class resources, mechanical reactions.

## Lore, Journal, Search, DM screen
Lore kinds `note/handout/dm/npc`. Journal kinds `auto/story/recap/context/downtime/ai`. Calendar + downtime; recap push. **Search (v22):** ⌕ in the top bar. **DM screen (v22):** 📜 — rules reference + house rules (`settings.houseRules`).

## Cloud data model
`profiles`, `characters` (jsonb incl. `build`, `inventory[].use`, `coins`, `npc`, `defenses`, `critMin`, `companions[]`), `campaigns` (+`bestiary`; `map.bg/walls`; `settings.*` incl. `ai`, `houseRules`), `campaign_members`, `lore_notes`, `battles` (state incl. `walls`, `bg`, `pending`, `effects`), `journal`, `feedback`.

---

## Version changelog (condensed)
- **v1–v16** — Core app → Supabase → battles → portraits → rooms → cards → slots.
- **v17** — DigitalOcean + wontonvtt.app.
- **v18** — Battle map v2, conditions, to-hit, save targeting, compendium, DDB sync, handouts, Journal, phone-first.
- **v19** — DDB-style builder, DM seat, feedback form, Player Guide.
- **v20** — Multiclass/feats/subraces/level-up, inventory, print, map merge, Table view, calendar, NPCs, recap push.
- **v21** — Parity sprint: damage pipeline, concentration, undo, resync, AoE, drag/zoom, read-more, economy, effects.
- **v22** — Companion sheets; campaign search; DM screen; AI Dungeon Master.
- **v23** — AI DM live (env mapping fix). Story tab keeps drafts/scroll. AI `map` + `move` commands, wall tiles.
- **v24** — Scaling resources: slot picker on cast, upcast tables, riders (Divine Smite), pools (Lay on Hands), Ki/Sorcery Points, editor scaling fields, half-caster slot fix.
- **v25** — Combat deep-dive: class kits for every SRD class, items in battle, standard actions, player-rolled saves + DM call-for-save, mechanical reactions.
- **v26** — Table tools: chat/whispers/checks, spell preparation, encounter budget + XP, treasure & random tables, travel & weather, factions, shops, file export/import, table-side mode. Player Guide updated (fighting, between fights, table-side, DM extras).

---

## Known limitations
- SRD only in the builder (one subclass per class; curated feats); PHB content arrives via DDB import. NPC `secret` UI-hidden only. Battle rooms LWW; no offline queue; themes palette-level. No audio/video; no dynamic lighting (by choice). Portraits/maps text-to-image only.
- AI DM: one reply per player message (no round-robin gating); the model only knows SRD monster indexes; map images generate on the owner's device then sync.
- Subclass features beyond the handful wired (Champion, Life, Lore, Devotion, Fiend, Moon) are text-only; metamagic is a point spend + log, not per-spell automation.

## Next (prioritized)
1. First real session; relay feedback.
2. AI DM polish: round-robin "waiting on X" mode, streaming replies, scene images, auto recaps, XP milestones.
3. Spectator link; offline action queue; drag-to-measure; theme fidelity.
