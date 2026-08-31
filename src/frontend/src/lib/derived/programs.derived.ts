import { SOLANA_PROGRAMS } from '$env/programs/programs.sol.env';
import type { ProgramUi } from '$lib/types/program';
import { readable, type Readable } from 'svelte/store';

/**
 * Every program OISY can name, across the chains that have any.
 *
 * A store rather than the array itself, so the day a chain resolves its programs at runtime the
 * consumers do not change.
 */
export const allPrograms: Readable<ProgramUi[]> = readable(SOLANA_PROGRAMS);
