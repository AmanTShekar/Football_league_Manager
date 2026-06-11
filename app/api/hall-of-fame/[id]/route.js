import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function DELETE(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  await pool.query('DELETE FROM hall_of_fame WHERE id = $1', [params.id]);
  return NextResponse.json({ success: true });
}
