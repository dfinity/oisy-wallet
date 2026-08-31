import type { ProgramUi } from '$lib/types/program';
import jup from '$sol/assets/jup.svg';
import orca from '$sol/assets/orca.svg';
import ray from '$sol/assets/ray.svg';

/**
 * The Solana programs OISY can name.
 *
 * Small on purpose. A program the list does not carry is shown as its address, which is honest;
 * guessing a name from anything the chain offers would not be, since the only on-chain data a
 * program account holds is its code.
 */
export const SOLANA_PROGRAMS: ProgramUi[] = [
	{
		address: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
		name: 'Orca Whirlpools',
		icon: orca
	},
	{
		address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
		name: 'Jupiter',
		icon: jup
	},
	{
		address: 'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS',
		name: 'Raydium Router',
		icon: ray
	}
];
