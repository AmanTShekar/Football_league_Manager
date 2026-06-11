import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function POST() {
  await initDb();
  const pool = getPool();

  const existing = await pool.query("SELECT COUNT(*)::int AS c FROM leagues WHERE name = 'PPL Season 1'");
  if (existing.rows[0].c > 0) return NextResponse.json({ error: 'Already seeded' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pl = await client.query(`
      INSERT INTO players (name) VALUES
        ('Rizwin'), ('Prannav'), ('Ashwin'), ('Bibin'), ('Joel'),
        ('Shon'), ('Ajin'), ('Vishnu')
      RETURNING id, name
    `);
    const players = {};
    for (const r of pl.rows) players[r.name] = r.id;

    const lg = await client.query(
      "INSERT INTO leagues (name, type, legs) VALUES ('PPL Season 1', 'round-robin', 1) RETURNING id"
    );
    const leagueId = lg.rows[0].id;

    for (const p of Object.values(players)) {
      await client.query('INSERT INTO league_participants (player_id, league_id) VALUES ($1, $2)', [p, leagueId]);
    }

    const names = Object.keys(players);
    let matchCount = 0;
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const hg = Math.floor(Math.random() * 5);
        const ag = Math.floor(Math.random() * 5);
        const r = await client.query(
          'INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index, leg) VALUES ($1, $2, $3, $4, $5, 1, 0, 1) RETURNING id',
          [leagueId, players[names[i]], players[names[j]], hg, ag]
        );
        matchCount++;
        if (hg !== ag) {
          const winnerId = hg > ag ? players[names[i]] : players[names[j]];
          await client.query('INSERT INTO player_match_wins (player_id, match_id, league_id) VALUES ($1, $2, $3)', [winnerId, r.rows[0].id, leagueId]);
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ seeded: true, league_id: leagueId, players: Object.keys(players).length, matches: matchCount });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
