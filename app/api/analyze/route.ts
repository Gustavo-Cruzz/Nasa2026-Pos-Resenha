import { NextRequest, NextResponse } from 'next/server';
import { analyze } from '@/lib/engine';
export async function POST(request: NextRequest) { try { return NextResponse.json(analyze(await request.json())); } catch (error) { return NextResponse.json({ status: 'error', code: 'INVALID_ANALYSIS_INPUT', message: error instanceof Error ? error.message : 'Invalid input.' }, { status: 422 }); } }
