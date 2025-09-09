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

	const mockErc721Nft1 = {
		...mockValidErc721Nft,
		id: parseNftId(123),
		collection: {
			...mockValidErc721Nft.collection,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
		}
	};
	const mockErc721Nft2 = {
		...mockValidErc721Nft,
		id: parseNftId(321),
		collection: {
			...mockValidErc721Nft.collection,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
		}
	};
	const mockErc721Nft3 = {
		...mockValidErc721Nft,
		id: parseNftId(876),
		collection: {
			...mockValidErc721Nft.collection,
			address: DE_GODS_TOKEN.address,
			network: DE_GODS_TOKEN.network
		}
	};

	const mockErc1155Nft1 = {
		...mockValidErc1155Nft,
		id: parseNftId(234),
		collection: {
			...mockValidErc1155Nft.collection,
			address: NYAN_CAT_TOKEN.address,
			network: NYAN_CAT_TOKEN.network
		}
	};
	const mockErc1155Nft2 = {
		...mockValidErc1155Nft,
		id: parseNftId(432),
		collection: {
			...mockValidErc1155Nft.collection,
			address: NYAN_CAT_TOKEN.address,
			network: NYAN_CAT_TOKEN.network
		}
	};
	const mockErc1155Nft3 = {
		...mockValidErc1155Nft,
		id: parseNftId(657),
		collection: {
			...mockValidErc1155Nft.collection,
			address: BUILD_AN_APE_TOKEN.address,
			network: BUILD_AN_APE_TOKEN.network
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

		nftStore.resetAll();

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

			mockGetNftsForOwner.mockResolvedValueOnce([mockErc721Nft1, mockErc721Nft2, mockErc721Nft3]);

			render(LoaderNfts, {
				props: {
					skipInitialLoad: false
				}
			});

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledOnce();

				expect(mockGetNftsForOwner).toHaveBeenCalledWith({
					address: mockEthAddress,
					tokens: [mockedEnabledAzukiToken, mockedEnabledGodsToken]
				});

				expect(get(nftStore)).toEqual([mockErc721Nft1, mockErc721Nft2, mockErc721Nft3]);
			});
		});

		it('should add new ERC1155 nfts', async () => {
			erc1155CustomTokensStore.setAll([
				{ data: mockedEnabledNyanToken, certified: false },
				{ data: mockedEnabledApeToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([mockErc1155Nft1, mockErc1155Nft2]);
			mockGetNftsForOwner.mockResolvedValueOnce([mockErc1155Nft3]);

			render(LoaderNfts, {
				props: {
					skipInitialLoad: false
				}
			});

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledTimes(2);

				expect(mockGetNftsForOwner).toHaveBeenCalledWith({
					address: mockEthAddress,
					tokens: [mockedEnabledNyanToken]
				});

				expect(mockGetNftsForOwner).toHaveBeenCalledWith({
					address: mockEthAddress,
					tokens: [mockedEnabledApeToken]
				});

				expect(get(nftStore)).toEqual([mockErc1155Nft1, mockErc1155Nft2, mockErc1155Nft3]);
			});
		});
	});

	describe('handleRemovedNfts', () => {
		it('should remove ERC721 nfts from nft store', async () => {
			nftStore.addAll([mockErc721Nft1, mockErc721Nft2, mockErc721Nft3]);

			erc721CustomTokensStore.setAll([
				{ data: mockedEnabledAzukiToken, certified: false },
				{ data: mockedEnabledGodsToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([mockErc721Nft1]);

			render(LoaderNfts, {
				props: {
					skipInitialLoad: false
				}
			});

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledOnce();

				expect(get(nftStore)).toEqual([mockErc721Nft1]);
			});
		});

		it('should remove ERC1155 nfts from nft store', async () => {
			nftStore.addAll([mockErc1155Nft1, mockErc1155Nft2, mockErc1155Nft3]);

			erc1155CustomTokensStore.setAll([
				{ data: mockedEnabledNyanToken, certified: false },
				{ data: mockedEnabledApeToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([mockErc1155Nft1]);
			mockGetNftsForOwner.mockResolvedValueOnce([]);

			render(LoaderNfts, {
				props: {
					skipInitialLoad: false
				}
			});

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledTimes(2);

				expect(get(nftStore)).toEqual([mockErc1155Nft1]);
			});
		});
	});

	describe('handleUpdatedNfts', () => {
		beforeEach(() => {
			nftStore.addAll([mockErc1155Nft1, mockErc1155Nft2, mockErc1155Nft3]);
		});

		it('should update ERC1155 nfts from the nft store', async () => {
			erc1155CustomTokensStore.setAll([
				{ data: mockedEnabledNyanToken, certified: false },
				{ data: mockedEnabledApeToken, certified: false }
			]);

			mockGetNftsForOwner.mockResolvedValueOnce([
				{ ...mockErc1155Nft1, balance: 2 },
				{ ...mockErc1155Nft2, balance: 1 }
			]);
			mockGetNftsForOwner.mockResolvedValueOnce([{ ...mockErc1155Nft3, balance: 3 }]);

			render(LoaderNfts, {
				props: {
					skipInitialLoad: false
				}
			});

			await waitFor(() => {
				expect(mockGetNftsForOwner).toHaveBeenCalledTimes(2);

				expect(get(nftStore)).toEqual([
					mockErc1155Nft1,
					{ ...mockErc1155Nft2, balance: 1 },
					{ ...mockErc1155Nft3, balance: 3 }
				]);
			});
		});
	});
});
