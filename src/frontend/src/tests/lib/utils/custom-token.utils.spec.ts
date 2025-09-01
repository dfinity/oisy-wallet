import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';

describe('custom-token.utils', () => {
	describe('toCustomToken', () => {
		const mockParams = {
			enabled: true,
			version: 1n,
			section: CustomTokenSection.SPAM
		};

		const partialExpected = {
			enabled: true,
			version: [1n],
			section: [{ Spam: null }],
			allow_external_content_source: []
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

		it('should convert to CustomToken with nullish section', () => {
			expect(
				toCustomToken({
					...mockParams,
					section: undefined,
					networkKey: 'Icrc',
					ledgerCanisterId: mockLedgerCanisterId,
					indexCanisterId: mockIndexCanisterId
				})
			).toEqual({
				...partialExpected,
				section: [],
				token: {
					Icrc: {
						ledger_id: Principal.fromText(mockLedgerCanisterId),
						index_id: [Principal.fromText(mockIndexCanisterId)]
					}
				}
			});
		});

		it('should return correct type for Icrc network key', () => {
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

		it('should return correct type for Ethereum/EVM Erc20 network key', () => {
			expect(
				toCustomToken({
					...mockParams,
					networkKey: 'Erc20',
					address: 'mock-token-address',
					chainId: 123n
				})
			).toEqual({
				...partialExpected,
				token: {
					Erc20: {
						token_address: 'mock-token-address',
						chain_id: 123n
					}
				}
			});
		});

		it('should return correct type for Ethereum/EVM Erc721 network key', () => {
			expect(
				toCustomToken({
					...mockParams,
					networkKey: 'Erc721',
					address: 'mock-token-address',
					chainId: 123n
				})
			).toEqual({
				...partialExpected,
				token: {
					Erc721: {
						token_address: 'mock-token-address',
						chain_id: 123n
					}
				}
			});
		});

		it('should return correct type for Ethereum/EVM Erc1155 network key', () => {
			expect(
				toCustomToken({
					...mockParams,
					networkKey: 'Erc1155',
					address: 'mock-token-address',
					chainId: 123n
				})
			).toEqual({
				...partialExpected,
				token: {
					Erc1155: {
						token_address: 'mock-token-address',
						chain_id: 123n
					}
				}
			});
		});

		it('should return correct type for SplMainnet network key', () => {
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

		it('should return correct type for SplDevnet network key', () => {
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

		it('should throw an error for unsupported network key', () => {
			expect(() =>
				toCustomToken({
					...mockParams,
					// @ts-expect-error we test this in purposes
					networkKey: 'UnsupportedNetwork',
					address: 'mock-token-address',
					decimals: 8,
					symbol: 'mock-symbol'
				})
			).toThrow('Unsupported network key: UnsupportedNetwork');
		});
	});
});
