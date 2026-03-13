import {
	buildIcrcCustomTokenMetadataPseudoResponse,
	buildIcrcMetadataResponse,
	buildIcrcTokensMetadataEntries
} from '$icp/utils/icrc-metadata.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { IcrcMetadataResponseEntries } from '@icp-sdk/canisters/ledger/icrc';

describe('icrc-metadata.utils', () => {
	describe('buildIcrcMetadataResponse', () => {
		it('should build metadata response with all fields', () => {
			const result = buildIcrcMetadataResponse({
				name: 'TestToken',
				symbol: 'TT',
				fee: 10_000n,
				decimals: 8
			});

			expect(result).toEqual([
				[IcrcMetadataResponseEntries.SYMBOL, { Text: 'TT' }],
				[IcrcMetadataResponseEntries.NAME, { Text: 'TestToken' }],
				[IcrcMetadataResponseEntries.FEE, { Nat: 10_000n }],
				[IcrcMetadataResponseEntries.DECIMALS, { Nat: 8n }]
			]);
		});

		it('should convert decimals to BigInt', () => {
			const result = buildIcrcMetadataResponse({
				name: 'Token',
				symbol: 'TKN',
				fee: ZERO,
				decimals: 18
			});

			const decimalsEntry = result.find(([key]) => key === IcrcMetadataResponseEntries.DECIMALS);

			expect(decimalsEntry).toEqual([IcrcMetadataResponseEntries.DECIMALS, { Nat: 18n }]);
		});
	});

	describe('buildIcrcTokensMetadataEntries', () => {
		it('should build entries for tokens with complete metadata', () => {
			const tokens = [
				{ ledgerCanisterId: 'canister-1', name: 'Token1', symbol: 'T1', fee: 100n, decimals: 8 },
				{ ledgerCanisterId: 'canister-2', name: 'Token2', symbol: 'T2', fee: 200n, decimals: 6 }
			];

			const result = buildIcrcTokensMetadataEntries(tokens);

			expect(result).toHaveLength(2);
			expect(result[0][0]).toBe('canister-1');
			expect(result[0][1]).toEqual([
				[IcrcMetadataResponseEntries.SYMBOL, { Text: 'T1' }],
				[IcrcMetadataResponseEntries.NAME, { Text: 'Token1' }],
				[IcrcMetadataResponseEntries.FEE, { Nat: 100n }],
				[IcrcMetadataResponseEntries.DECIMALS, { Nat: 8n }],
				[IcrcMetadataResponseEntries.LOGO, { Text: '/icons/icrc/canister-1.png' }]
			]);
			expect(result[1][0]).toBe('canister-2');
		});

		it('should skip tokens with missing name', () => {
			const tokens = [
				{ ledgerCanisterId: 'canister-1', symbol: 'T1', fee: 100n, decimals: 8 },
				{ ledgerCanisterId: 'canister-2', name: 'Token2', symbol: 'T2', fee: 200n, decimals: 6 }
			];

			const result = buildIcrcTokensMetadataEntries(tokens);

			expect(result).toHaveLength(1);
			expect(result[0][0]).toBe('canister-2');
		});

		it('should skip tokens with missing symbol', () => {
			const tokens = [{ ledgerCanisterId: 'canister-1', name: 'Token1', fee: 100n, decimals: 8 }];

			const result = buildIcrcTokensMetadataEntries(tokens);

			expect(result).toHaveLength(0);
		});

		it('should skip tokens with missing fee', () => {
			const tokens = [
				{ ledgerCanisterId: 'canister-1', name: 'Token1', symbol: 'T1', decimals: 8 }
			];

			const result = buildIcrcTokensMetadataEntries(tokens);

			expect(result).toHaveLength(0);
		});

		it('should skip tokens with missing decimals', () => {
			const tokens = [{ ledgerCanisterId: 'canister-1', name: 'Token1', symbol: 'T1', fee: 100n }];

			const result = buildIcrcTokensMetadataEntries(tokens);

			expect(result).toHaveLength(0);
		});

		it('should return empty array for empty input', () => {
			const result = buildIcrcTokensMetadataEntries([]);

			expect(result).toEqual([]);
		});

		it('should skip all tokens when none have complete metadata', () => {
			const tokens = [
				{ ledgerCanisterId: 'canister-1' },
				{ ledgerCanisterId: 'canister-2', name: 'Partial' }
			];

			const result = buildIcrcTokensMetadataEntries(tokens);

			expect(result).toEqual([]);
		});
	});

	describe('buildIcrcCustomTokenMetadataPseudoResponse', () => {
		it('should return undefined if token is not found', () => {
			const result = buildIcrcCustomTokenMetadataPseudoResponse({
				ledgerCanisterId: mockValidIcToken.ledgerCanisterId,
				icrcCustomTokens: {}
			});

			expect(result).toBeUndefined();
		});

		it('should return pseudo metadata response if token exists', () => {
			const token = { ...mockValidIcToken, icon: 'https://icon.png' };

			const result = buildIcrcCustomTokenMetadataPseudoResponse({
				ledgerCanisterId: token.ledgerCanisterId,
				icrcCustomTokens: {
					[token.ledgerCanisterId]: token
				}
			});

			expect(result).toEqual([
				[IcrcMetadataResponseEntries.SYMBOL, { Text: token.symbol }],
				[IcrcMetadataResponseEntries.NAME, { Text: token.name }],
				[IcrcMetadataResponseEntries.FEE, { Nat: token.fee }],
				[IcrcMetadataResponseEntries.DECIMALS, { Nat: BigInt(token.decimals) }],
				[IcrcMetadataResponseEntries.LOGO, { Text: token.icon }]
			]);
		});

		it('should handle nullish token icon', () => {
			const { icon: _, ...token } = mockValidIcToken;

			const result = buildIcrcCustomTokenMetadataPseudoResponse({
				ledgerCanisterId: token.ledgerCanisterId,
				icrcCustomTokens: {
					[token.ledgerCanisterId]: token
				}
			});

			expect(result).toEqual([
				[IcrcMetadataResponseEntries.SYMBOL, { Text: token.symbol }],
				[IcrcMetadataResponseEntries.NAME, { Text: token.name }],
				[IcrcMetadataResponseEntries.FEE, { Nat: token.fee }],
				[IcrcMetadataResponseEntries.DECIMALS, { Nat: BigInt(token.decimals) }]
			]);
		});
	});
});
