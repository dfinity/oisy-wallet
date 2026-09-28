import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { parseCustomTokenId, toCustomToken } from '$lib/utils/custom-token.utils';
import { mockDip721TokenCanisterId } from '$tests/mocks/dip721-tokens.mock';
import { mockExtV2TokenCanisterId } from '$tests/mocks/ext-v2-token.mock';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

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
			allow_external_content_source: [],
			allowed_external_content_source_urls: toNullable()
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

		it('should return correct type for ExtV2 network key', () => {
			const networkKey = 'ExtV2';

			expect(
				toCustomToken({
					...mockParams,
					networkKey,
					canisterId: mockExtV2TokenCanisterId
				})
			).toEqual({
				...partialExpected,
				token: {
					ExtV2: {
						canister_id: Principal.fromText(mockExtV2TokenCanisterId)
					}
				}
			});
		});

		it('should return correct type for Dip721 network key', () => {
			const networkKey = 'Dip721';

			expect(
				toCustomToken({
					...mockParams,
					networkKey,
					canisterId: mockDip721TokenCanisterId
				})
			).toEqual({
				...partialExpected,
				token: {
					Dip721: {
						canister_id: Principal.fromText(mockDip721TokenCanisterId)
					}
				}
			});
		});

		it('should return correct type for IcPunks network key', () => {
			const networkKey = 'IcPunks';

			expect(
				toCustomToken({
					...mockParams,
					networkKey,
					canisterId: mockIcPunksCanisterId
				})
			).toEqual({
				...partialExpected,
				token: {
					IcPunks: {
						canister_id: Principal.fromText(mockIcPunksCanisterId)
					}
				}
			});
		});

		it('should return correct type for Icrc7 network key', () => {
			const networkKey = 'Icrc7';

			expect(
				toCustomToken({
					...mockParams,
					networkKey,
					canisterId: mockIcrc7CanisterId
				})
			).toEqual({
				...partialExpected,
				token: {
					Icrc7: {
						canister_id: Principal.fromText(mockIcrc7CanisterId)
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

		it('should return correct type for Ethereum/EVM Erc4626 network key', () => {
			expect(
				toCustomToken({
					...mockParams,
					networkKey: 'Erc4626',
					address: 'mock-token-address',
					chainId: 123n
				})
			).toEqual({
				...partialExpected,
				token: {
					Erc4626: {
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

	describe('parseCustomTokenId', () => {
		it('should return the same TokenId (referentially equal) for repeated calls with the same address, chain and standard', () => {
			const params = { identifier: '0xTokenAddress', chainId: 1n, standard: 'erc20' } as const;

			const id1 = parseCustomTokenId(params);
			const id2 = parseCustomTokenId(params);
			const id3 = parseCustomTokenId({ ...params });

			expect(id1).toBe(id2);
			expect(id1).toBe(id3);
		});

		it('should return different TokenIds for different addresses on the same chain', () => {
			const idA = parseCustomTokenId({
				identifier: '0xTokenAddressA',
				chainId: 1n,
				standard: 'erc20'
			});
			const idB = parseCustomTokenId({
				identifier: '0xTokenAddressB',
				chainId: 1n,
				standard: 'erc20'
			});

			expect(idA).not.toBe(idB);
		});

		it('should return different TokenIds for the same address on different chains', () => {
			const idMainnet = parseCustomTokenId({
				identifier: '0xTokenAddress',
				chainId: 1n,
				standard: 'erc20'
			});
			const idOtherChain = parseCustomTokenId({
				identifier: '0xTokenAddress',
				chainId: 4663n,
				standard: 'erc20'
			});

			expect(idMainnet).not.toBe(idOtherChain);
		});

		it('should return different TokenIds for the same address and chain with different standards', () => {
			const idErc721 = parseCustomTokenId({
				identifier: '0xCollectionAddress',
				chainId: 1n,
				standard: 'erc721'
			});
			const idErc1155 = parseCustomTokenId({
				identifier: '0xCollectionAddress',
				chainId: 1n,
				standard: 'erc1155'
			});

			expect(idErc721).not.toBe(idErc1155);
		});

		it('should keep the standard out of the TokenId description', () => {
			const id = parseCustomTokenId({
				identifier: '0xDescriptionAddress',
				chainId: 1n,
				standard: 'erc20'
			});

			expect(id.description).toBe('custom-token#0xDescriptionAddress#1');
		});
	});
});
