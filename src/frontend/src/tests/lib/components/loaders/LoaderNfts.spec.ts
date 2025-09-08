import * as nftEnv from '$env/nft.env';
import type { AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as alchemyProvidersModule from '$eth/providers/alchemy.providers';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import LoaderNfts from '$lib/components/loaders/LoaderNfts.svelte';
import { ethAddressStore } from '$lib/stores/address.store';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { BUILD_AN_APE_TOKEN, NYAN_CAT_TOKEN } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('LoaderNfts', () => {
	let alchemyProvidersSpy: MockInstance;

	const mockGetNftsForOwner = vi.fn();

	const mockedEnabledAzukiToken = { ...AZUKI_ELEMENTAL_BEANS_TOKEN, enabled: true };
	const mockedEnabledGodsToken = { ...DE_GODS_TOKEN, enabled: true };
	const mockedEnabledNyanToken = { ...NYAN_CAT_TOKEN, enabled: true };
	const mockedEnabledApeToken = { ...BUILD_AN_APE_TOKEN, enabled: true };

	const mockNft1 = {
		...mockValidErc721Nft,
		id: parseNftId(123),
		collection: {
			...mockValidErc721Nft.collection,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
		}
	};
	const mockNft2 = {
		...mockValidErc721Nft,
		id: parseNftId(321),
		collection: {
			...mockValidErc721Nft.collection,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
		}
	};
	const mockNft3 = {
		...mockValidErc721Nft,
		id: parseNftId(876),
		collection: {
			...mockValidErc721Nft.collection,
			address: DE_GODS_TOKEN.address,
			network: DE_GODS_TOKEN.network
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();

		alchemyProvidersSpy = vi.spyOn(alchemyProvidersModule, 'alchemyProviders');
		alchemyProvidersSpy.mockReturnValue({
			getNftsByOwner: mockGetNftsForOwner
		} as unknown as AlchemyProvider);

		erc721CustomTokensStore.resetAll();
		erc1155CustomTokensStore.resetAll();

		vi.spyOn(nftEnv, 'NFTS_ENABLED', 'get').mockImplementation(() => true);

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		ethAddressStore.set({ data: mockEthAddress, certified: false });
	});

	describe('handleNewNfts', () => {
		it('should add new ERC721 nfts', async () => {
			erc721CustomTokensStore.setAll([
				{ data: mockedEnabledAzukiToken, certified: false },
				{ data: mockedEnabledGodsToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([mockNft1, mockNft2]);
			mockGetNftsForOwner.mockResolvedValueOnce([mockNft3]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledTimes(2);

				expect(mockGetNftsForOwner).toHaveBeenCalledWith({
					address: mockEthAddress,
					token: mockedEnabledAzukiToken
				});

				expect(mockGetNftsForOwner).toHaveBeenCalledWith({
					address: mockEthAddress,
					token: mockedEnabledGodsToken
				});
			});
		});

		it('should add new ERC1155 nfts', async () => {
			erc1155CustomTokensStore.setAll([
				{ data: mockedEnabledNyanToken, certified: false },
				{ data: mockedEnabledApeToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([mockNft1, mockNft2]);
			mockGetNftsForOwner.mockResolvedValueOnce([mockNft3]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledTimes(2);

				expect(mockGetNftsForOwner).toHaveBeenCalledWith({
					address: mockEthAddress,
					token: mockedEnabledNyanToken
				});

				expect(mockGetNftsForOwner).toHaveBeenCalledWith({
					address: mockEthAddress,
					token: mockedEnabledApeToken
				});
			});
		});
	});

	describe('handleRemovedNfts', () => {
		beforeEach(() => {
			nftStore.resetAll();
		});

		it('should remove ERC721 nfts from nft store', async () => {
			nftStore.addAll([mockNft1, mockNft2, mockNft3]);

			erc721CustomTokensStore.setAll([
				{ data: mockedEnabledAzukiToken, certified: false },
				{ data: mockedEnabledGodsToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([mockNft1]);
			mockGetNftsForOwner.mockResolvedValueOnce([]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledTimes(2);

				expect(get(nftStore)).toEqual([mockNft1]);
			});
		});

		it('should remove ERC1155 nfts from nft store', async () => {
			const customMockNft1 = {
				...mockNft1,
				collection: {
					...mockValidErc1155Nft.collection,
					address: NYAN_CAT_TOKEN.address,
					network: NYAN_CAT_TOKEN.network
				}
			};

			nftStore.addAll([
				customMockNft1,
				{
					...mockNft2,
					collection: {
						...mockValidErc1155Nft.collection,
						address: NYAN_CAT_TOKEN.address,
						network: NYAN_CAT_TOKEN.network
					}
				},
				{
					...mockNft3,
					collection: {
						...mockValidErc1155Nft.collection,
						address: BUILD_AN_APE_TOKEN.address,
						network: BUILD_AN_APE_TOKEN.network
					}
				}
			]);

			erc1155CustomTokensStore.setAll([
				{ data: mockedEnabledNyanToken, certified: false },
				{ data: mockedEnabledApeToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([customMockNft1]);
			mockGetNftsForOwner.mockResolvedValueOnce([]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledTimes(2);

				expect(get(nftStore)).toEqual([customMockNft1]);
			});
		});
	});

	describe('handleUpdatedNfts', () => {
		const customMockNft1 = {
			...mockValidErc1155Nft,
			id: parseNftId(123),
			collection: {
				...mockValidErc1155Nft.collection,
				address: NYAN_CAT_TOKEN.address,
				network: NYAN_CAT_TOKEN.network
			}
		};
		const customMockNft2 = {
			...mockValidErc1155Nft,
			id: parseNftId(321),
			collection: {
				...mockValidErc1155Nft.collection,
				address: NYAN_CAT_TOKEN.address,
				network: NYAN_CAT_TOKEN.network
			}
		};
		const customMockNft3 = {
			...mockValidErc1155Nft,
			id: parseNftId(876),
			collection: {
				...mockValidErc1155Nft.collection,
				address: BUILD_AN_APE_TOKEN.address,
				network: BUILD_AN_APE_TOKEN.network
			}
		};

		beforeEach(() => {
			nftStore.resetAll();
			nftStore.addAll([customMockNft1, customMockNft2, customMockNft3]);
		});

		it('should update ERC1155 nfts from the nft store', async () => {
			erc1155CustomTokensStore.setAll([
				{ data: mockedEnabledNyanToken, certified: false },
				{ data: mockedEnabledApeToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([
				{ ...customMockNft1, balance: 2 },
				{ ...customMockNft2, balance: 1 }
			]);
			mockGetNftsForOwner.mockResolvedValueOnce([{ ...customMockNft3, balance: 3 }]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledTimes(2);

				expect(get(nftStore)).toEqual([
					customMockNft1,
					{ ...customMockNft2, balance: 1 },
					{ ...customMockNft3, balance: 3 }
				]);
			});
		});
	});
});
