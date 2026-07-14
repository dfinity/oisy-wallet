import { GHOSTNODE_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { IC_CKBTC_MINTER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { IcCkInterface, IcInterface } from '$icp/types/ic-token';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import {
	CUSTOM_SYMBOLS_BY_LEDGER_CANISTER_ID,
	isTokenDip20,
	isTokenIc,
	isTokenIcp,
	isTokenIcrc,
	isTokenIcrcCustomToken,
	mapIcrcToken,
	mapTokenOisyName,
	mapTokenOisySymbol,
	sortIcTokens,
	type IcrcLoadData
} from '$icp/utils/icrc.utils';
import { TokenCategoryTagValue, TokenRiskTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenStandard, TokenStandardCode } from '$lib/types/token';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';
import {
	mockIndexCanisterId,
	mockLedgerCanisterId,
	mockValidIcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIcrcAccount } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import {
	IcrcMetadataResponseEntries,
	type IcrcTokenMetadataResponse
} from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

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
			mintingAccount: mockIcrcAccount,
			icrcCustomTokens: {
				[mockToken.ledgerCanisterId]: mockToken
			}
		};
		const mockParamsWithUrlIcon: IcrcLoadData = {
			...mockParams,
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

		describe('indexCanisterId', () => {
			it('should backfill the index canister id from icrcCustomTokens when none is provided', () => {
				const token = mapIcrcToken({
					...mockParams,
					icrcCustomTokens: {
						[mockToken.ledgerCanisterId]: { ...mockToken, indexCanisterId: mockIndexCanisterId }
					}
				});

				expect(token?.indexCanisterId).toBe(mockIndexCanisterId);
			});

			it('should keep a provided index canister id over the icrcCustomTokens one', () => {
				const providedIndexCanisterId = mockLedgerCanisterId;

				const token = mapIcrcToken({
					...mockParams,
					indexCanisterId: providedIndexCanisterId,
					icrcCustomTokens: {
						[mockToken.ledgerCanisterId]: { ...mockToken, indexCanisterId: mockIndexCanisterId }
					}
				});

				expect(token?.indexCanisterId).toBe(providedIndexCanisterId);
			});

			it('should not set an index canister id when neither is provided nor curated', () => {
				const token = mapIcrcToken(mockParams);

				expect(token?.indexCanisterId).toBeUndefined();
			});
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
					[mockToken.ledgerCanisterId]: { ...mockToken, standard: { code: 'bitcoin' } }
				}
			});

			expect(token).toStrictEqual({
				...mockToken,
				id: token?.id,
				standard: { code: 'bitcoin' }
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
				standard: { code: 'icrc' }
			});
		});

		describe('tags', () => {
			it('should default tags to crypto when icrcCustomTokens is not provided', () => {
				const token = mapIcrcToken({
					...mockParams,
					icrcCustomTokens: undefined
				});

				expect(token?.tags).toStrictEqual([
					{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }
				]);
			});

			it('should use tags from icrcCustomTokens when provided', () => {
				const token = mapIcrcToken({
					...mockParams,
					icrcCustomTokens: {
						[mockToken.ledgerCanisterId]: {
							...mockToken,
							tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }]
						}
					}
				});

				expect(token?.tags).toStrictEqual([
					{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }
				]);
			});

			it('should default tags to crypto when token is not in icrcCustomTokens', () => {
				const token = mapIcrcToken({
					...mockParams,
					icrcCustomTokens: {
						['other-canister-id']: mockToken
					}
				});

				expect(token?.tags).toStrictEqual([
					{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }
				]);
			});

			describe('twin token tag inheritance', () => {
				const mockStablecoinTwinToken = {
					...mockValidToken,
					standard: { code: 'erc20' as const },
					tags: [
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }
					] as typeof mockValidToken.tags
				};

				const mockCommodityTwinToken = {
					...mockValidToken,
					standard: { code: 'erc20' as const },
					tags: [
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.COMMODITY }
					] as typeof mockValidToken.tags
				};

				const mockCryptoTwinToken = {
					...mockValidToken,
					standard: { code: 'erc20' as const },
					tags: [
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }
					] as typeof mockValidToken.tags
				};

				it('should inherit STABLECOIN tag from twinToken when no icrcCustomTokens are provided', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: undefined,
						twinToken: mockStablecoinTwinToken
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }
					]);
				});

				it('should inherit COMMODITY tag from twinToken', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: undefined,
						twinToken: mockCommodityTwinToken
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.COMMODITY }
					]);
				});

				it('should inherit STOCK tag from twinToken', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: undefined,
						twinToken: {
							...mockValidToken,
							standard: { code: 'erc20' as const },
							tags: [
								{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }
							] as typeof mockValidToken.tags
						}
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }
					]);
				});

				it('should inherit RISK tag from twinToken', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: undefined,
						twinToken: {
							...mockValidToken,
							standard: { code: 'erc20' as const },
							tags: [
								{ type: TokenTagType.RISK, value: TokenRiskTagValue.HIGH }
							] as typeof mockValidToken.tags
						}
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.RISK, value: TokenRiskTagValue.HIGH }
					]);
				});

				it('should inherit twinToken tags when icrcCustomTokens exists but token is not in the map', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: {
							['other-canister-id']: mockToken
						},
						twinToken: mockStablecoinTwinToken
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }
					]);
				});

				it('should inherit twinToken tags with ck token metadata (minterCanisterId)', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: undefined,
						minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
						twinToken: mockStablecoinTwinToken
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }
					]);
				});

				it('should still get CRYPTO tags when twinToken is CRYPTO (no-op inheritance)', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: undefined,
						twinToken: mockCryptoTwinToken
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }
					]);
				});

				it('should prioritize icrcCustomTokens tags over twinToken tags', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: {
							[mockToken.ledgerCanisterId]: {
								...mockToken,
								tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }]
							}
						},
						twinToken: mockStablecoinTwinToken
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }
					]);
				});

				it('should prioritize icrcCustomTokens STABLECOIN tags over twinToken CRYPTO tags', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: {
							[mockToken.ledgerCanisterId]: {
								...mockToken,
								tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }]
							}
						},
						twinToken: mockCryptoTwinToken
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }
					]);
				});

				it('should fall back to DEFAULT_TOKEN_TAGS when there is no twinToken and no icrcCustomTokens', () => {
					const token = mapIcrcToken({
						...mockParams,
						icrcCustomTokens: undefined
					});

					expect(token?.tags).toStrictEqual([
						{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }
					]);
				});
			});
		});

		describe('groupData', () => {
			const mockGroupData = {
				id: parseTokenGroupId('TEST'),
				name: 'Test Group',
				symbol: 'TEST'
			};

			it('should propagate groupData from icrcCustomTokens when present', () => {
				const token = mapIcrcToken({
					...mockParams,
					icrcCustomTokens: {
						[mockToken.ledgerCanisterId]: { ...mockToken, groupData: mockGroupData }
					}
				});

				expect(token?.groupData).toStrictEqual(mockGroupData);
			});

			it('should not set groupData when the token in icrcCustomTokens has no groupData', () => {
				const { groupData: _, ...mockTokenWithoutGroupData } = mockToken;

				const token = mapIcrcToken({
					...mockParams,
					icrcCustomTokens: {
						[mockToken.ledgerCanisterId]: mockTokenWithoutGroupData
					}
				});

				expect(token?.groupData).toBeUndefined();
			});

			it('should not set groupData when icrcCustomTokens is not provided', () => {
				const token = mapIcrcToken({
					...mockParams,
					icrcCustomTokens: undefined
				});

				expect(token?.groupData).toBeUndefined();
			});

			it('should not set groupData when the token is not found in icrcCustomTokens', () => {
				const token = mapIcrcToken({
					...mockParams,
					icrcCustomTokens: {
						['other-canister-id']: { ...mockToken, groupData: mockGroupData }
					}
				});

				expect(token?.groupData).toBeUndefined();
			});
		});

		describe('mintingAccount', () => {
			it('should use explicit mintingAccount when provided', () => {
				const token = mapIcrcToken(mockParams);

				expect(token?.mintingAccount).toStrictEqual(mockIcrcAccount);
			});

			it('should derive mintingAccount from minterCanisterId when mintingAccount is not provided', () => {
				const { mintingAccount: _, ...paramsWithoutMintingAccount } = mockParams;

				const token = mapIcrcToken({
					...paramsWithoutMintingAccount,
					minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
				});

				expect(token?.mintingAccount).toStrictEqual(
					getIcrcAccount(Principal.fromText(IC_CKBTC_MINTER_CANISTER_ID))
				);
			});

			it('should prefer explicit mintingAccount over minterCanisterId', () => {
				const token = mapIcrcToken({
					...mockParams,
					minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
				});

				expect(token?.mintingAccount).toStrictEqual(mockIcrcAccount);
				expect(token?.mintingAccount).not.toStrictEqual(
					getIcrcAccount(Principal.fromText(IC_CKBTC_MINTER_CANISTER_ID))
				);
			});

			it('should have undefined mintingAccount when neither mintingAccount nor minterCanisterId is provided', () => {
				const { mintingAccount: _, ...paramsWithoutMintingAccount } = mockParams;

				const token = mapIcrcToken(paramsWithoutMintingAccount);

				expect(token?.mintingAccount).toBeUndefined();
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

	describe('isTokenIcp', () => {
		it.each(['icp'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenIcp({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcp({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
				).toBeFalsy();
			}
		);
	});

	describe('isTokenIcrc', () => {
		it.each(['icrc'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenIcrc({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
			).toBeTruthy();
		});

		it.each(['icp', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcrc({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
				).toBeFalsy();
			}
		);
	});

	describe('isTokenDip20', () => {
		it.each(['dip20'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenDip20({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
			).toBeTruthy();
		});

		it.each(['icp', 'icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenDip20({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);
	});

	describe('isTokenIc', () => {
		it.each(['icp', 'icrc', 'dip20'])(
			'should return true for valid token standards: %s',
			(standard) => {
				expect(
					isTokenIc({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
				).toBeTruthy();
			}
		);

		it.each(['ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIc({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
				).toBeFalsy();
			}
		);
	});

	describe('isTokenIcrcCustomToken', () => {
		it.each(['icp', 'icrc'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenIcrcCustomToken({
					...mockIcrcCustomToken,
					standard: { code: standard as TokenStandardCode }
				})
			).toBeTruthy();
		});

		it.each(['ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcrcCustomToken({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);

		it('should return true is the token has the prop `enabled`', () => {
			expect(isTokenIcrcCustomToken({ ...mockIcrcCustomToken, enabled: true })).toBeTruthy();

			expect(isTokenIcrcCustomToken({ ...mockIcrcCustomToken, enabled: false })).toBeTruthy();
		});

		it('should return false is the token has no prop `enabled`', () => {
			const { enabled: _, ...mockIcrcCustomTokenWithoutEnabled } = mockIcrcCustomToken;

			expect(isTokenIcrcCustomToken(mockIcrcCustomTokenWithoutEnabled)).toBeFalsy();
		});
	});

	describe('mapTokenOisyName', () => {
		const mockToken: IcInterface = {
			ledgerCanisterId: mockLedgerCanisterId
		};

		it('should return the token as it is if it is not an IcCkInterface', () => {
			const token = mockToken;

			expect(token).not.toHaveProperty('minterCanisterId');
			expect(token).not.toHaveProperty('twinToken');

			expect(mapTokenOisyName(token)).toStrictEqual(token);
		});

		it('should return the token as it is if there is no twin token', () => {
			const token: IcCkInterface = {
				...mockToken,
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
			};

			expect(token).not.toHaveProperty('twinToken');

			expect(mapTokenOisyName(token)).toStrictEqual(token);
		});

		it('should return the token with OISY name if there is a twin token', () => {
			const token: IcCkInterface = {
				...mockToken,
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
				twinToken: ETHEREUM_TOKEN
			};

			expect(mapTokenOisyName(token)).toStrictEqual({
				...token,
				oisyName: {
					prefix: 'ck',
					oisyName: ETHEREUM_TOKEN.name
				}
			});
		});
	});

	describe('mapTokenOisySymbol', () => {
		const mockToken: IcInterface = {
			ledgerCanisterId: mockLedgerCanisterId
		};

		it('should return the token as it is if there is no custom symbol', () => {
			expect(mapTokenOisySymbol(mockToken)).toStrictEqual(mockToken);
		});

		it('should return the token with OISY symbol if there is a custom symbol', () => {
			const token = { ...mockToken, ledgerCanisterId: GHOSTNODE_LEDGER_CANISTER_ID };

			expect(mapTokenOisySymbol(token)).toStrictEqual({
				...token,
				oisySymbol: {
					oisySymbol: CUSTOM_SYMBOLS_BY_LEDGER_CANISTER_ID[GHOSTNODE_LEDGER_CANISTER_ID]
				}
			});
		});
	});
});
