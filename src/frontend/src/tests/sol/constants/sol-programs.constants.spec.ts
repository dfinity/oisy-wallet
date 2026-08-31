import { SOLANA_KNOWN_PROGRAM_NAMES } from '$sol/constants/sol-programs.constants';
import { assertIsAddress } from '@solana/kit';

describe('sol-programs.constants', () => {
	describe('SOLANA_KNOWN_PROGRAM_NAMES', () => {
		const programs = Object.entries(SOLANA_KNOWN_PROGRAM_NAMES).map(([programAddress, name]) => ({
			programAddress,
			name
		}));

		// A typo would put a vetted name on some other address entirely, which is worse than
		// showing no name at all.
		it.each(programs)('should hold a valid address for $name', ({ programAddress }) => {
			expect(() => assertIsAddress(programAddress)).not.toThrow();
		});

		it.each(programs)('should name $programAddress', ({ name }) => {
			expect(name.trim()).not.toBe('');
		});

		it('should not name two programs the same', () => {
			const names = programs.map(({ name }) => name);

			expect(new Set(names).size).toBe(names.length);
		});
	});
});
