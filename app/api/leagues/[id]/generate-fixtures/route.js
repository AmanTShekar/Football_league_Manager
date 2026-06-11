import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';
import { shuffle } from '@/lib/constants';

export async function POST(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const league = await pool.query('SELECT legs FROM leagues WHERE id = $1', [params.id]);
  const legs = Math.max(1, league.rows[0]?.legs || 1);
  const players = await pool.query('SELECT player_id FROM league_participants WHERE league_id = $1', [params.id]);
  if (players.rows.length < 2) return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 });
  const existing = await pool.query('SELECT COUNT(*)::int AS c FROM matches WHERE league_id = $1', [params.id]);
  if (existing.rows[0].c > 0) return NextResponse.json({ error: 'Delete existing matches first' }, { status: 400 });
  const ids = shuffle(players.rows.map(t => t.player_id));
  const fixtures = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (legs <= 1) {
        if (Math.random() < 0.5) fixtures.push({ home: ids[i], away: ids[j] });
        else fixtures.push({ home: ids[j], away: ids[i] });
      } else {
        for (let k = 0; k < legs; k++) {
          if ((k % 2) === 0) fixtures.push({ home: ids[i], away: ids[j] });
          else fixtures.push({ home: ids[j], away: ids[i] });
        }
      }
    }
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const f of fixtures) {
      await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index, leg) VALUES ($1, $2, $3, 0, 0, 1, 0, 1)', [params.id, f.home, f.away]);
    }
    await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index, leg) VALUES ($1, NULL, NULL, 0, 0, 2, 0, 1)', [params.id]);
    await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index, leg) VALUES ($1, NULL, NULL, 0, 0, 3, 0, 1)', [params.id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  return NextResponse.json({ count: fixtures.length + 2 });
}
