import type { TokenId } from '$lib/types/token';
import {
	isSimulatedFailure,
	parseSimulatedSymbols,
	simulatedSummary,
	unknownSimulatedSymbols,
	type SimulatedFailures
} from '$lib/utils/simulated-canister-failures.utils';
import { parseTokenId } from '$lib/validation/token.validation';

describe('simulated-canister-failures.utils', () => {
	describe('parseSimulatedSymbols', () => {
		it('should split on commas and upper-case', () => {
			expect(parseSimulatedSymbols('gldt,PANDA')).toStrictEqual(['GLDT', 'PANDA']);
		});

		it('should ignore spacing', () => {
			expect(parseSimulatedSymbols('  gldt ,   PaNdA  ')).toStrictEqual(['GLDT', 'PANDA']);
		});

		it.each(['', '   ', ',', ' , , '])('should resolve nothing for %j', (symbols) => {
			expect(parseSimulatedSymbols(symbols)).toStrictEqual([]);
		});
	});

	describe('isSimulatedFailure', () => {
		const tokenId: TokenId = parseTokenId('PANDA');
		const failures: SimulatedFailures = { indexSymbols: ['PANDA'], ledgerSymbols: ['GLDT'] };

		it('should match the token id description against the simulated index symbols', () => {
			expect(isSimulatedFailure({ tokenId, kind: 'index', failures })).toBeTruthy();
		});

		it('should not match a kind the token is not listed for', () => {
			expect(isSimulatedFailure({ tokenId, kind: 'ledger', failures })).toBeFalsy();
		});

		it('should match the ledger symbols for a ledger check', () => {
			expect(
				isSimulatedFailure({ tokenId: parseTokenId('GLDT'), kind: 'ledger', failures })
			).toBeTruthy();
		});

		it('should ignore casing', () => {
			expect(
				isSimulatedFailure({ tokenId: parseTokenId('panda'), kind: 'index', failures })
			).toBeTruthy();
		});

		it('should not match another token', () => {
			expect(
				isSimulatedFailure({ tokenId: parseTokenId('EXE'), kind: 'index', failures })
			).toBeFalsy();
		});

		it('should not match when nothing is simulated', () => {
			expect(
				isSimulatedFailure({
					tokenId,
					kind: 'index',
					failures: { indexSymbols: [], ledgerSymbols: [] }
				})
			).toBeFalsy();
		});
	});

	describe('unknownSimulatedSymbols', () => {
		const tokens = [{ symbol: 'GLDT' }, { symbol: 'PANDA' }];

		it('should report a symbol that matches no token', () => {
			expect(unknownSimulatedSymbols({ symbols: ['GLDT', 'TYPO'], tokens })).toStrictEqual([
				'TYPO'
			]);
		});

		it('should report nothing when every symbol matches', () => {
			expect(unknownSimulatedSymbols({ symbols: ['GLDT', 'PANDA'], tokens })).toStrictEqual([]);
		});

		it('should compare case-insensitively', () => {
			expect(
				unknownSimulatedSymbols({ symbols: ['GLDT'], tokens: [{ symbol: 'gldt' }] })
			).toStrictEqual([]);
		});
	});

	describe('simulatedSummary', () => {
		it('should label each symbol with its kind', () => {
			expect(simulatedSummary({ indexSymbols: ['PANDA'], ledgerSymbols: ['GLDT'] })).toBe(
				'PANDA (index), GLDT (ledger)'
			);
		});

		it('should be empty when nothing is simulated', () => {
			expect(simulatedSummary({ indexSymbols: [], ledgerSymbols: [] })).toBe('');
		});
	});
});
