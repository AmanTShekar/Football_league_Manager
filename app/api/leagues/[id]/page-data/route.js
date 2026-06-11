import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';
import { playerColor } from '@/lib/constants';

export async function GET(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();

  const l = (await pool.query('SELECT * FROM leagues WHERE id = $1', [params.id])).rows[0];
  if (!l) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const part = await pool.query('SELECT p.id, p.name, lp.id AS link_id FROM league_participants lp JOIN players p ON lp.player_id = p.id WHERE lp.league_id = $1 ORDER BY p.name', [params.id]);
  const matches = await pool.query('SELECT m.*, hp.name AS home_player, ap.name AS away_player FROM matches m LEFT JOIN players hp ON m.home_player_id = hp.id LEFT JOIN players ap ON m.away_player_id = ap.id WHERE m.league_id = $1 ORDER BY m.round ASC, m.match_index ASC', [params.id]);

  const leagueType = l.type;
  let standings = null;

  if (leagueType !== 'knockout') {
    const allMatches = matches.rows.filter(m => m.round === 1);
    const players = part.rows;
    const stats = {};
    for (const p of players) {
      stats[p.id] = { player_id: p.id, name: p.name, color: playerColor(p.id), mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    }
    for (const m of allMatches) {
      if (!stats[m.home_player_id] || !stats[m.away_player_id]) continue;
      if (m.home_goals === 0 && m.away_goals === 0) continue;
      stats[m.home_player_id].mp++; stats[m.away_player_id].mp++;
      stats[m.home_player_id].gf += m.home_goals; stats[m.home_player_id].ga += m.away_goals;
      stats[m.away_player_id].gf += m.away_goals; stats[m.away_player_id].ga += m.home_goals;
      if (m.home_goals > m.away_goals) { stats[m.home_player_id].w++; stats[m.home_player_id].pts += 3; stats[m.away_player_id].l++; }
      else if (m.home_goals < m.away_goals) { stats[m.away_player_id].w++; stats[m.away_player_id].pts += 3; stats[m.home_player_id].l++; }
      else { stats[m.home_player_id].d++; stats[m.away_player_id].d++; stats[m.home_player_id].pts++; stats[m.away_player_id].pts++; }
    }
    for (const s of Object.values(stats)) s.gd = s.gf - s.ga;
    standings = Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    }).map((s, i) => ({ ...s, position: i + 1 }));
  }

  return NextResponse.json({
    league: l,
    participants: part.rows,
    matches: matches.rows,
    standings: standings ? { type: 'league', standings } : null,
  });
}
