import { resolveSimulatedCanisterIds } from '$lib/utils/simulated-canister-failures.utils';

describe('simulated-canister-failures.utils', () => {
	describe('resolveSimulatedCanisterIds', () => {
		const tokens = [
			{ symbol: 'GLDT', ledgerCanisterId: 'gldt-ledger', indexCanisterId: 'gldt-index' },
			{ symbol: 'PANDA', ledgerCanisterId: 'panda-ledger', indexCanisterId: 'panda-index' },
			{ symbol: 'NOIDX', ledgerCanisterId: 'noidx-ledger' }
		];

		it('should resolve the index canister IDs', () => {
			const { canisterIds, matchedSymbols, unknownSymbols } = resolveSimulatedCanisterIds({
				symbols: 'GLDT,PANDA',
				tokens,
				kind: 'index'
			});

			expect(canisterIds).toStrictEqual(['gldt-index', 'panda-index']);
			expect(matchedSymbols).toStrictEqual(['GLDT', 'PANDA']);
			expect(unknownSymbols).toStrictEqual([]);
		});

		it('should resolve the ledger canister IDs', () => {
			const { canisterIds } = resolveSimulatedCanisterIds({
				symbols: 'GLDT',
				tokens,
				kind: 'ledger'
			});

			expect(canisterIds).toStrictEqual(['gldt-ledger']);
		});

		it('should ignore spacing and casing', () => {
			const { canisterIds, matchedSymbols } = resolveSimulatedCanisterIds({
				symbols: '  gldt ,   PaNdA  ',
				tokens,
				kind: 'index'
			});

			expect(canisterIds).toStrictEqual(['gldt-index', 'panda-index']);
			// Reported back with the token's own casing, so the tester sees what actually matched.
			expect(matchedSymbols).toStrictEqual(['GLDT', 'PANDA']);
		});

		it('should report an unknown symbol instead of silently dropping it', () => {
			const { canisterIds, unknownSymbols } = resolveSimulatedCanisterIds({
				symbols: 'GLDT,TYPO',
				tokens,
				kind: 'index'
			});

			expect(canisterIds).toStrictEqual(['gldt-index']);
			expect(unknownSymbols).toStrictEqual(['TYPO']);
		});

		it('should report a token that has no index canister', () => {
			const { canisterIds, unknownSymbols } = resolveSimulatedCanisterIds({
				symbols: 'NOIDX',
				tokens,
				kind: 'index'
			});

			expect(canisterIds).toStrictEqual([]);
			expect(unknownSymbols).toStrictEqual(['NOIDX']);
		});

		it('should resolve the ledger canister of a token that has no index canister', () => {
			const { canisterIds, unknownSymbols } = resolveSimulatedCanisterIds({
				symbols: 'NOIDX',
				tokens,
				kind: 'ledger'
			});

			expect(canisterIds).toStrictEqual(['noidx-ledger']);
			expect(unknownSymbols).toStrictEqual([]);
		});

		it.each(['', '   ', ',', ' , , '])('should resolve nothing for %j', (symbols) => {
			const { canisterIds, matchedSymbols, unknownSymbols } = resolveSimulatedCanisterIds({
				symbols,
				tokens,
				kind: 'index'
			});

			expect(canisterIds).toStrictEqual([]);
			expect(matchedSymbols).toStrictEqual([]);
			expect(unknownSymbols).toStrictEqual([]);
		});
	});
});
