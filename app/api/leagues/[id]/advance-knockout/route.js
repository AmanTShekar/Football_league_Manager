import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function POST(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const league = await pool.query('SELECT legs FROM leagues WHERE id = $1', [params.id]);
  const legsCount = Math.max(1, league.rows[0]?.legs || 1);
  const currentRound = (await pool.query('SELECT COALESCE(MAX(round), 1)::int AS r FROM matches WHERE league_id = $1', [params.id])).rows[0].r;
  const roundMatches = (await pool.query('SELECT * FROM matches WHERE league_id = $1 AND round = $2 ORDER BY match_index ASC, leg ASC', [params.id, currentRound])).rows;
  const winners = [];

  function getWinner(match) {
    if (match.home_player_id === match.away_player_id) return match.home_player_id;
    if (match.penalty_winner_id) return match.penalty_winner_id;
    if (match.home_goals === match.away_goals) return null;
    return match.home_goals > match.away_goals ? match.home_player_id : match.away_player_id;
  }

  if (legsCount >= 2 && roundMatches.some(m => m.leg === 2)) {
    const ties = {};
    for (const m of roundMatches) {
      if (m.home_player_id === m.away_player_id) { ties[m.match_index] = { winner: m.home_player_id }; continue; }
      if (!ties[m.match_index]) ties[m.match_index] = { a_id: m.home_player_id, b_id: m.away_player_id, a_goals: 0, b_goals: 0, penalty: null };
      ties[m.match_index].a_goals += m.home_goals;
      ties[m.match_index].b_goals += m.away_goals;
      if (m.penalty_winner_id) ties[m.match_index].penalty = m.penalty_winner_id;
    }
    for (const t of Object.values(ties)) {
      if (!t.winner) {
        if (t.penalty) { t.winner = t.penalty; }
        else if (t.a_goals === t.b_goals) return NextResponse.json({ error: 'Round has draws on aggregate. Use penalties or adjust scores.' }, { status: 400 });
        else t.winner = t.a_goals > t.b_goals ? t.a_id : t.b_id;
      }
      winners.push(t.winner);
    }
  } else {
    for (const m of roundMatches) {
      const w = getWinner(m);
      if (!w) return NextResponse.json({ error: 'Round has draws. Set a penalty winner or adjust scores.' }, { status: 400 });
      winners.push(w);
    }
  }
  const nextRound = currentRound + 1;
  if (winners.length === 1) {
    await pool.query('DELETE FROM matches WHERE league_id = $1 AND round > $2', [params.id, currentRound]);
    return NextResponse.json({ complete: true, champion_id: winners[0] });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index) VALUES ($1, $2, $3, 0, 0, $4, $5)', [params.id, winners[i], winners[i + 1], nextRound, i / 2]);
      } else {
        await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index) VALUES ($1, $2, $2, 0, 0, $3, $4)', [params.id, winners[i], nextRound, i / 2]);
      }
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  return NextResponse.json({ round: nextRound, champion: nextRound + 1 === winners.length });
}
