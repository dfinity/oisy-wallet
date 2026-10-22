import { SOLANA_KNOWN_PROGRAM_ADDRESSES } from '$sol/constants/sol-known-programs.constants';
import { STAKE_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { isAddress } from '@solana/kit';

describe('sol-known-programs.constants', () => {
	it('should hold only valid program addresses', () => {
		expect(SOLANA_KNOWN_PROGRAM_ADDRESSES.filter((address) => !isAddress(address))).toEqual([]);
	});

	it('should name each program once', () => {
		expect(new Set(SOLANA_KNOWN_PROGRAM_ADDRESSES).size).toBe(
			SOLANA_KNOWN_PROGRAM_ADDRESSES.length
		);
	});

	// Jupiter routes swaps such as EURC to USDC through its pools.
	it('should know the FusionAMM pools', () => {
		expect(SOLANA_KNOWN_PROGRAM_ADDRESSES).toContain('fUSioN9YKKSa3CUC2YUc4tPkHJ5Y6XW1yz8y6F7qWz9');
	});

	// A stake account is held outside the wallet and its token accounts, which is exactly what the
	// confirmation is for: a call to the stake program must always ask for it.
	it('should leave out the stake program', () => {
		expect(SOLANA_KNOWN_PROGRAM_ADDRESSES).not.toContain(STAKE_PROGRAM_ADDRESS);
	});
});
