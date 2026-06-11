export const COLORS = [
  '#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261',
  '#7b2cbf','#d62828','#003049','#606c38','#00b4d8',
  '#b56576','#4a4e69','#0b525b','#f77f00','#1d3557',
  '#6a040f','#5a189a','#0077b6','#90e0ef','#e5989b',
  '#6d6875','#b5838d','#ffcdb2','#ffb4a2','#283618',
  '#8d0801','#370617','#6a994e','#bc4749','#a7c957'
];

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function roundName(r, totalRounds) {
  if (r === totalRounds) return 'Final';
  if (r === totalRounds - 1) return 'Semi-Finals';
  const diff = totalRounds - r;
  if (diff === 2) return 'Quarter-Finals';
  if (diff === 3) return 'Round of 16';
  if (diff === 4) return 'Round of 32';
  return 'Round ' + r;
}

export async function computeLeagueStatus(pool, leagueId) {
  const pc = (await pool.query('SELECT COUNT(*)::int AS c FROM league_participants WHERE league_id = $1', [leagueId])).rows[0].c;
  const mc = (await pool.query('SELECT COUNT(*)::int AS c FROM matches WHERE league_id = $1', [leagueId])).rows[0].c;
  const played = (await pool.query("SELECT COUNT(*)::int AS c FROM matches WHERE league_id = $1 AND NOT (home_goals = 0 AND away_goals = 0)", [leagueId])).rows[0].c;
  if (pc >= 2 && mc === 0) return 'ready';
  if (mc > 0 && played === 0) return 'started';
  if (played > 0 && played < mc) return 'ongoing';
  if (mc > 0 && played === mc) return 'completed';
  return 'draft';
}

export function playerColor(playerId) {
  return COLORS[Math.abs(playerId) % COLORS.length];
}
