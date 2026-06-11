import { Pool } from '@neondatabase/serverless';

let pool = null;
let initPromise = null;
let dbReady = false;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }
  return pool;
}

export async function initDb() {
  if (dbReady) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
  const p = getPool();
  await p.query(`
    DROP TABLE IF EXISTS team_players CASCADE;
    DROP TABLE IF EXISTS teams CASCADE;
    CREATE TABLE IF NOT EXISTS leagues (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'league',
      legs INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE leagues ADD COLUMN IF NOT EXISTS legs INTEGER NOT NULL DEFAULT 1;
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
      home_player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
      away_player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
      home_goals INTEGER NOT NULL DEFAULT 0,
      away_goals INTEGER NOT NULL DEFAULT 0,
      round INTEGER NOT NULL DEFAULT 1,
      match_index INTEGER NOT NULL DEFAULT 0,
      leg INTEGER NOT NULL DEFAULT 1
    );
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS leg INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_winner_id INTEGER REFERENCES players(id) ON DELETE SET NULL;
    ALTER TABLE hall_of_fame DROP CONSTRAINT IF EXISTS uq_hof_player_league;
    ALTER TABLE hall_of_fame ADD CONSTRAINT uq_hof_player_league UNIQUE (player_id, league_id);
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS league_participants (
      id SERIAL PRIMARY KEY,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS hall_of_fame (
      id SERIAL PRIMARY KEY,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      wins INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS player_match_wins (
      id SERIAL PRIMARY KEY,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id);
    CREATE INDEX IF NOT EXISTS idx_participants_league ON league_participants(league_id);
    ALTER TABLE hall_of_fame ALTER COLUMN league_id DROP NOT NULL;
  `);
  const leagueIds = (await p.query('SELECT id FROM leagues')).rows.map(r => r.id);
  await p.query('DELETE FROM hall_of_fame WHERE league_id IS NOT NULL');
  for (const lid of leagueIds) {
    const championId = await detectChampion(p, lid);
    if (championId) {
      await p.query('INSERT INTO hall_of_fame (player_id, league_id, wins, created_at) VALUES ($1, $2, 1, NOW())', [championId, lid]);
    }
  }
  dbReady = true;
  })();
  return initPromise;
}

export async function detectChampionByBracket(pool, leagueId) {
  const all = (await pool.query(
    'SELECT * FROM matches WHERE league_id = $1 ORDER BY round DESC',
    [leagueId]
  )).rows;
  if (!all.length) return null;
  const maxRound = Math.max(...all.map(m => m.round));
  if (maxRound <= 1) return null;
  const finals = all.filter(m => m.round === maxRound);
  const final = finals.find(m => !(m.home_goals === 0 && m.away_goals === 0) || m.penalty_winner_id);
  if (!final || !final.home_player_id || !final.away_player_id) return null;
  if (final.penalty_winner_id) return final.penalty_winner_id;
  if (final.home_goals === final.away_goals) return null;
  return final.home_goals > final.away_goals ? final.home_player_id : final.away_player_id;
}

export async function detectChampion(pool, leagueId) {
  const league = await pool.query('SELECT type, legs FROM leagues WHERE id = $1', [leagueId]);
  if (!league.rows.length) return null;
  const all = (await pool.query(
    'SELECT * FROM matches WHERE league_id = $1 ORDER BY round ASC, match_index ASC',
    [leagueId]
  )).rows;
  if (!all.length) return null;

  const maxRound = Math.max(...all.map(m => m.round));

  if (maxRound > 1) {
  const finals = all.filter(m => m.round === maxRound);
  const final = finals.find(m => !(m.home_goals === 0 && m.away_goals === 0) || m.penalty_winner_id);
  if (!final || !final.home_player_id || !final.away_player_id) return null;
  if (final.penalty_winner_id) return final.penalty_winner_id;
  if (final.home_goals === final.away_goals) return null;
  return final.home_goals > final.away_goals ? final.home_player_id : final.away_player_id;
}

const matches = all.filter(m => m.round === 1);
  const allPlayed = matches.length > 0 && matches.every(m => !(m.home_goals === 0 && m.away_goals === 0));
  if (!allPlayed) return null;

  const players = (await pool.query(
    'SELECT p.id, p.name FROM league_participants lp JOIN players p ON lp.player_id = p.id WHERE lp.league_id = $1 ORDER BY p.name',
    [leagueId]
  )).rows;

  const stats = {};
  for (const p of players) stats[p.id] = { player_id: p.id, pts: 0, gd: 0, gf: 0 };
  for (const m of matches) {
    if (!stats[m.home_player_id] || !stats[m.away_player_id]) continue;
    if (m.home_goals === 0 && m.away_goals === 0) continue;
    stats[m.home_player_id].gf += m.home_goals; stats[m.home_player_id].gd += m.home_goals - m.away_goals;
    stats[m.away_player_id].gf += m.away_goals; stats[m.away_player_id].gd += m.away_goals - m.home_goals;
    if (m.home_goals > m.away_goals) stats[m.home_player_id].pts += 3;
    else if (m.home_goals < m.away_goals) stats[m.away_player_id].pts += 3;
    else { stats[m.home_player_id].pts += 1; stats[m.away_player_id].pts += 1; }
  }
  for (const s of Object.values(stats)) s.gd = s.gf - s.ga;
  const ranked = Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
  return ranked.length > 0 ? ranked[0].player_id : null;
}
