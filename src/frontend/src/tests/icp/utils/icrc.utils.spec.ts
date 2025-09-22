import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import {
	buildIcrcCustomTokenMetadataPseudoResponse,
	icTokenIcrcCustomToken,
	isTokenDip20,
	isTokenIc,
	isTokenIcp,
	isTokenIcrc,
	isIcrcTokenSupportIcrc2,
	mapIcrcToken,
	sortIcTokens,
	type IcrcLoadData
} from '$icp/utils/icrc.utils';
import type { TokenStandard } from '$lib/types/token';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	IcrcMetadataResponseEntries,
	type IcrcStandardRecord,
	type IcrcTokenMetadataResponse
} from '@dfinity/ledger-icrc';

vi.mock('$icp/api/icrc-ledger.api', () => ({
	icrc1SupportedStandards: vi.fn()
}));

describe('icrc.utils', () => {
	describe('mapIcrcToken', () => {
		const mockToken = { ...mockValidIcToken, icon: 'mock-icon' };
		const mockMetadata: IcrcTokenMetadataResponse = [
			[IcrcMetadataResponseEntries.SYMBOL, { Text: mockToken.symbol }],
			[IcrcMetadataResponseEntries.NAME, { Text: mockToken.name }],
			[IcrcMetadataResponseEntries.FEE, { Nat: mockToken.fee }],
			[IcrcMetadataResponseEntries.DECIMALS, { Nat: BigInt(mockToken.decimals) }],
			[IcrcMetadataResponseEntries.LOGO, { Text: mockToken.icon }]
		];
		const mockParams: IcrcLoadData = {
			metadata: mockMetadata,
			category: 'default',
			ledgerCanisterId: mockValidIcToken.ledgerCanisterId,
			position: 1,
			icrcCustomTokens: {
				[mockToken.ledgerCanisterId]: mockToken
			}
		};
		const mockParamsWithUrlIcon: IcrcLoadData = {
			metadata: mockMetadata,
			category: 'default',
			ledgerCanisterId: mockValidIcToken.ledgerCanisterId,
			position: 1,
			icrcCustomTokens: {
				[mockToken.ledgerCanisterId]: { ...mockToken, icon: 'https://icon.png' }
			}
		};

		it('should return undefined if metadata is empty', () => {
			expect(mapIcrcToken({ ...mockParams, metadata: [] })).toBeUndefined();
		});

		it('should return undefined if metadata are incomplete', () => {
			expect(
				mapIcrcToken({
					...mockParams,
					metadata: mockMetadata.slice(0, 2)
				})
			).toBeUndefined();
		});

		it('should map a token with icon and extended fields from icrcCustomTokens', () => {
			const token = mapIcrcToken(mockParams);

			expect(token).toStrictEqual({
				...mockToken,
				id: token?.id
			});
			expect(token?.id.description).toBe(mockToken.symbol);
		});

		it('should map a token without icon when the icon is missing form metadata and icrcCustomTokens', () => {
			const token = mapIcrcToken({
				...mockParams,
				metadata: mockMetadata.slice(0, mockMetadata.length - 1),
				icrcCustomTokens: {
					[mockToken.ledgerCanisterId]: { ...mockToken, icon: undefined }
				}
			});

			const { icon: _, ...mockTokenWithoutIcon } = mockToken;

			expect(token).toStrictEqual({
				...mockTokenWithoutIcon,
				id: token?.id
			});
		});

		it('should use the icon from icrcCustomTokens if the icon is missing from metadata', () => {
			const token = mapIcrcToken({
				...mockParams,
				metadata: mockMetadata.slice(0, mockMetadata.length - 1)
			});

			expect(token).toStrictEqual({
				...mockToken,
				id: token?.id
			});
			expect(token?.id.description).toBe(mockToken.symbol);
			expect(token?.icon).toBe(mockToken.icon);
		});

		it('should use the static icon if the icon is an URL', () => {
			const token = mapIcrcToken({
				...mockParamsWithUrlIcon,
				metadata: [
					...mockMetadata.slice(0, mockMetadata.length - 1),
					[IcrcMetadataResponseEntries.LOGO, { Text: 'https://example.com/icon.png' }]
				]
			});

			expect(token).toStrictEqual({
				...mockToken,
				icon: `/icons/icrc/${mockToken.ledgerCanisterId}.png`,
				id: token?.id
			});
			expect(token?.id.description).toBe(mockToken.symbol);
		});

		it('should use the static icon if the icon is an URL and the icon is missing from icrcCustomTokens', () => {
			const token = mapIcrcToken({
				...mockParamsWithUrlIcon,
				metadata: [
					...mockMetadata.slice(0, mockMetadata.length - 1),
					[IcrcMetadataResponseEntries.LOGO, { Text: 'https://example.com/icon.png' }]
				],
				icrcCustomTokens: {
					[mockToken.ledgerCanisterId]: { ...mockToken, icon: undefined }
				}
			});

			expect(token).toStrictEqual({
				...mockToken,
				icon: `/icons/icrc/${mockToken.ledgerCanisterId}.png`,
				id: token?.id
			});
			expect(token?.id.description).toBe(mockToken.symbol);
		});

		it('should use the static icon if the icon is an URL and the icon is missing from metadata', () => {
			const token = mapIcrcToken({
				...mockParamsWithUrlIcon,
				metadata: [...mockMetadata.slice(0, mockMetadata.length - 1)]
			});

			expect(token).toStrictEqual({
				...mockToken,
				icon: `/icons/icrc/${mockToken.ledgerCanisterId}.png`,
				id: token?.id
			});
			expect(token?.id.description).toBe(mockToken.symbol);
		});

		it('should prioritize the icon from icrcCustomTokens instead of the icon from metadata', () => {
			const metadataIcon = 'https://metadata-icon.png';

			const token = mapIcrcToken({
				...mockParams,
				metadata: [
					...mockMetadata.slice(0, mockMetadata.length - 1),
					[IcrcMetadataResponseEntries.LOGO, { Text: metadataIcon }]
				]
			});

			expect(token?.icon).toBe(mockToken.icon);
			expect(token?.icon).not.toBe(metadataIcon);
		});

		it('should prioritize the standard from icrcCustomTokens', () => {
			const token = mapIcrcToken({
				...mockParams,
				icrcCustomTokens: {
					[mockToken.ledgerCanisterId]: { ...mockToken, standard: 'bitcoin' }
				}
			});

			expect(token).toStrictEqual({
				...mockToken,
				id: token?.id,
				standard: 'bitcoin'
			});
		});

		it('should default the standard to icrc if not provided', () => {
			const token = mapIcrcToken({
				...mockParams,
				icrcCustomTokens: {
					[mockToken.ledgerCanisterId]: {
						...mockToken,
						standard: undefined as unknown as TokenStandard
					}
				}
			});

			expect(token).toStrictEqual({
				...mockToken,
				id: token?.id,
				standard: 'icrc'
			});
		});
	});

	describe('sortIcTokens', () => {
		it('should sort by position if different', () => {
			const a = { ...mockValidIcToken, name: 'A', position: 1 };
			const b = { ...mockValidIcToken, name: 'B', position: 2 };

			expect(sortIcTokens(a, b)).toBeLessThan(0);
		});

		it('should sort by exchangeCoinId if position is equal and exchangeCoinId exists', () => {
			const a = {
				...mockValidIcToken,
				name: 'Z',
				position: 1,
				exchangeCoinId: 'bitcoin' as const
			};
			const b = {
				...mockValidIcToken,
				name: 'Y',
				position: 1,
				exchangeCoinId: 'internet-computer' as const
			};
			const c = {
				...mockValidIcToken,
				name: 'Y',
				position: 1,
				exchangeCoinId: undefined
			};

			expect(sortIcTokens(a, b)).toBeLessThan(0);

			expect(sortIcTokens(a, c)).toBeGreaterThan(0);
		});

		it('should sort by name if position and exchangeCoinId are same or nullish', () => {
			const a = { ...mockValidIcToken, name: 'Alpha', position: 1 };
			const b = { ...mockValidIcToken, name: 'Beta', position: 1 };

			expect(sortIcTokens(a, b)).toBeLessThan(0);
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

	describe('isTokenIcp', () => {
		it.each(['icp'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenIcp({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcp({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeFalsy();
			}
		);
	});

	describe('isTokenIcrc', () => {
		it.each(['icrc'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenIcrc({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
			).toBeTruthy();
		});

		it.each(['icp', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcrc({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeFalsy();
			}
		);
	});

	describe('isTokenDip20', () => {
		it.each(['dip20'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenDip20({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
			).toBeTruthy();
		});

		it.each(['icp', 'icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenDip20({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeFalsy();
			}
		);
	});

	describe('isTokenIc', () => {
		it.each(['icp', 'icrc', 'dip20'])(
			'should return true for valid token standards: %s',
			(standard) => {
				expect(
					isTokenIc({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeTruthy();
			}
		);

		it.each(['ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIc({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeFalsy();
			}
		);
	});

	describe('icTokenIcrcCustomToken', () => {
		it.each(['icp', 'icrc'])('should return true for valid token standards: %s', (standard) => {
			expect(
				icTokenIcrcCustomToken({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
			).toBeTruthy();
		});

		it.each(['ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					icTokenIcrcCustomToken({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeFalsy();
			}
		);

		it('should return true is the token has the prop `enabled`', () => {
			expect(icTokenIcrcCustomToken({ ...mockIcrcCustomToken, enabled: true })).toBeTruthy();

			expect(icTokenIcrcCustomToken({ ...mockIcrcCustomToken, enabled: false })).toBeTruthy();
		});

		it('should return false is the token has no prop `enabled`', () => {
			const { enabled: _, ...mockIcrcCustomTokenWithoutEnabled } = mockIcrcCustomToken;

			expect(icTokenIcrcCustomToken(mockIcrcCustomTokenWithoutEnabled)).toBeFalsy();
		});
	});

	describe('isTokenSupportIcrc2', () => {
		const params = {
			identity: mockIdentity,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('returns true when ICRC-2 standard is supported', async () => {
			const supportedStandards: IcrcStandardRecord[] = [
				{ name: 'ICRC-1', url: 'https://github.com/dfinity/ICRC-1' },
				{ name: 'ICRC-2', url: 'https://github.com/dfinity/ICRC-2' },
				{ name: 'ICRC-3', url: 'https://github.com/dfinity/ICRC-3' }
			];

			vi.mocked(icrcLedgerApi.icrc1SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc2(params);

			expect(result).toBeTruthy();
			expect(icrcLedgerApi.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});

		it('returns false when ICRC-2 standard is not supported', async () => {
			const supportedStandards = [
				{ name: 'ICRC-1', url: 'https://github.com/dfinity/ICRC-1' },
				{ name: 'ICRC-3', url: 'https://github.com/dfinity/ICRC-3' }
			];

			vi.mocked(icrcLedgerApi.icrc1SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc2(params);

			expect(result).toBeFalsy();
			expect(icrcLedgerApi.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});

		it('returns false when no standards are supported', async () => {
			const supportedStandards: [] = [];

			vi.mocked(icrcLedgerApi.icrc1SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc2(params);

			expect(result).toBeFalsy();
			expect(icrcLedgerApi.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});

		it('returns true when only ICRC-2 is supported', async () => {
			const supportedStandards = [{ name: 'ICRC-2', url: 'https://github.com/dfinity/ICRC-2' }];

			vi.mocked(icrcLedgerApi.icrc1SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc2(params);

			expect(result).toBeTruthy();
			expect(icrcLedgerApi.icrc1SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});
	});
});
