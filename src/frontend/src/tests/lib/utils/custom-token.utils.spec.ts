import { toCustomToken } from '$lib/utils/custom-token.utils';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@dfinity/principal';

describe('custom-token.utils', () => {
	describe('toCustomToken', () => {
		const mockParams = {
			enabled: true,
			version: 1n
		};

		const partialExpected = {
			enabled: true,
			version: [1n]
		};

		it('should convert to CustomToken with nullish version', () => {
			expect(
				toCustomToken({
					...mockParams,
					version: undefined,
					networkKey: 'Icrc',
					ledgerCanisterId: mockLedgerCanisterId,
					indexCanisterId: mockIndexCanisterId
				})
			).toEqual({
				...partialExpected,
				version: [],
				token: {
					Icrc: {
						ledger_id: Principal.fromText(mockLedgerCanisterId),
						index_id: [Principal.fromText(mockIndexCanisterId)]
					}
				}
			});
		});

		it('should return correct type for Icrc network', () => {
			const networkKey = 'Icrc';

			expect(
				toCustomToken({
					...mockParams,
					networkKey,
					ledgerCanisterId: mockLedgerCanisterId,
					indexCanisterId: mockIndexCanisterId
				})
			).toEqual({
				...partialExpected,
				token: {
					Icrc: {
						ledger_id: Principal.fromText(mockLedgerCanisterId),
						index_id: [Principal.fromText(mockIndexCanisterId)]
					}
				}
			});

			expect(
				toCustomToken({
					...mockParams,
					networkKey,
					ledgerCanisterId: mockLedgerCanisterId
				})
			).toEqual({
				...partialExpected,
				token: {
					Icrc: {
						ledger_id: Principal.fromText(mockLedgerCanisterId),
						index_id: []
					}
				}
			});
		});

		it('should return correct type for SplMainnet network', () => {
			expect(
				toCustomToken({
					...mockParams,
					networkKey: 'SplMainnet',
					address: 'mock-token-address',
					decimals: 8,
					symbol: 'mock-symbol'
				})
			).toEqual({
				...partialExpected,
				token: {
					SplMainnet: {
						token_address: 'mock-token-address',
						decimals: [8],
						symbol: ['mock-symbol']
					}
				}
			});
		});

		it('should return correct type for SplDevnet network', () => {
			expect(
				toCustomToken({
					...mockParams,
					networkKey: 'SplDevnet',
					address: 'mock-token-address',
					decimals: 8,
					symbol: 'mock-symbol'
				})
			).toEqual({
				...partialExpected,
				token: {
					SplDevnet: {
						token_address: 'mock-token-address',
						decimals: [8],
						symbol: ['mock-symbol']
					}
				}
			});
		});
	});
});
