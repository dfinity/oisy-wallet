import type { AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as alchemyProvidersModule from '$eth/providers/alchemy.providers';
import type { EtherscanProvider } from '$eth/providers/etherscan.providers';
import * as etherscanProvidersModule from '$eth/providers/etherscan.providers';
import * as infuraErc1155ProvidersModule from '$eth/providers/infura-erc1155.providers';
import * as infuraErc721ProvidersModule from '$eth/providers/infura-erc721.providers';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import LoaderNfts from '$lib/components/loaders/LoaderNfts.svelte';
import * as addressStore from '$lib/derived/address.derived';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import * as nftServicesModule from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { BUILD_AN_APE_TOKEN, NYAN_CAT_TOKEN } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('LoaderNfts', () => {
	let etherscanProvidersSpy: MockInstance;
	let alchemyProvidersSpy: MockInstance;

	const mockErc721TokenInventory = vi.fn();
	const mockGetNftIdsForOwner = vi.fn();

	const mockedEnabledAzukiToken = { ...AZUKI_ELEMENTAL_BEANS_TOKEN, enabled: true };
	const mockedEnabledGodsToken = { ...DE_GODS_TOKEN, enabled: true };
	const mockedEnabledNyanToken = { ...NYAN_CAT_TOKEN, enabled: true };
	const mockedEnabledApeToken = { ...BUILD_AN_APE_TOKEN, enabled: true };

	const mockNftId1 = parseNftId(123543);
	const mockNftId2 = parseNftId(937826332);
	const mockNftId3 = parseNftId(93824);

	beforeEach(() => {
		vi.clearAllMocks();

		etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');
		etherscanProvidersSpy.mockReturnValue({
			erc721TokenInventory: mockErc721TokenInventory
		} as unknown as EtherscanProvider);

		alchemyProvidersSpy = vi.spyOn(alchemyProvidersModule, 'alchemyProviders');
		alchemyProvidersSpy.mockReturnValue({
			getNftIdsForOwner: mockGetNftIdsForOwner
		} as unknown as AlchemyProvider);

		erc721CustomTokensStore.resetAll();
		erc1155CustomTokensStore.resetAll();

		vi.spyOn(testnetsEnabled, 'subscribe').mockImplementation((fn) => {
			fn(true);
			return () => {};
		});

		vi.spyOn(addressStore, 'ethAddress', 'get').mockImplementation(() => readable(mockEthAddress));
	});

	describe('handleNewNfts', () => {
		let infuraErc721ProvidersSpy: MockInstance;
		let infuraErc1155ProvidersSpy: MockInstance;
		let loadNftIdsOfTokenSpy: MockInstance;

		beforeEach(() => {
			infuraErc721ProvidersSpy = vi.spyOn(infuraErc721ProvidersModule, 'infuraErc721Providers');
			infuraErc721ProvidersSpy.mockReturnValue({});

			infuraErc1155ProvidersSpy = vi.spyOn(infuraErc1155ProvidersModule, 'infuraErc1155Providers');
			infuraErc1155ProvidersSpy.mockReturnValue({});

			loadNftIdsOfTokenSpy = vi.spyOn(nftServicesModule, 'loadNftIdsOfToken');
		});

		it('should add new erc721 nfts of loaded nft ids', async () => {
			erc721CustomTokensStore.setAll([
				{ data: mockedEnabledAzukiToken, certified: false },
				{ data: mockedEnabledGodsToken, certified: false }
			]);

			mockErc721TokenInventory.mockResolvedValueOnce([mockNftId1, mockNftId2]);
			mockErc721TokenInventory.mockResolvedValueOnce([mockNftId3]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockErc721TokenInventory).toHaveBeenCalledTimes(2);

				expect(loadNftIdsOfTokenSpy).toHaveBeenCalledWith({
					infuraProvider: {},
					token: mockedEnabledAzukiToken,
					tokenIds: [mockNftId1, mockNftId2],
					walletAddress: mockEthAddress
				});

				expect(loadNftIdsOfTokenSpy).toHaveBeenCalledWith({
					infuraProvider: {},
					token: mockedEnabledGodsToken,
					tokenIds: [mockNftId3],
					walletAddress: mockEthAddress
				});
			});
		});

		it('should add new erc1155 nfts of loaded nft ids', async () => {
			erc1155CustomTokensStore.setAll([
				{ data: mockedEnabledNyanToken, certified: false },
				{ data: mockedEnabledApeToken, certified: false }
			]);

			mockGetNftIdsForOwner.mockResolvedValueOnce([
				{ id: mockNftId1, balance: 2 },
				{ id: mockNftId2, balance: 3 }
			]);
			mockGetNftIdsForOwner.mockResolvedValueOnce([{ id: mockNftId3, balance: 4 }]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockGetNftIdsForOwner).toHaveBeenCalledTimes(2);

				expect(loadNftIdsOfTokenSpy).toHaveBeenCalledWith({
					infuraProvider: {},
					token: mockedEnabledNyanToken,
					tokenIds: [mockNftId1, mockNftId2],
					walletAddress: mockEthAddress
				});

				expect(loadNftIdsOfTokenSpy).toHaveBeenCalledWith({
					infuraProvider: {},
					token: mockedEnabledApeToken,
					tokenIds: [mockNftId3],
					walletAddress: mockEthAddress
				});
			});
		});
	});

	describe('handleRemovedNfts', () => {
		beforeEach(() => {
			nftStore.resetAll();
		});

		it('should remove erc721 nfts from nft store', async () => {
			const mockNft1 = {
				...mockValidErc721Nft,
				id: mockNftId1,
				collection: {
					...mockValidErc721Nft.collection,
					address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
					network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
				}
			};
			const mockNft2 = {
				...mockValidErc721Nft,
				id: mockNftId2,
				collection: {
					...mockValidErc721Nft.collection,
					address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
					network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
				}
			};
			const mockNft3 = {
				...mockValidErc721Nft,
				id: mockNftId3,
				collection: {
					...mockValidErc721Nft.collection,
					address: DE_GODS_TOKEN.address,
					network: DE_GODS_TOKEN.network
				}
			};

			nftStore.addAll([mockNft1, mockNft2, mockNft3]);

			erc721CustomTokensStore.setAll([
				{ data: mockedEnabledAzukiToken, certified: false },
				{ data: mockedEnabledGodsToken, certified: false }
			]);

			mockErc721TokenInventory.mockResolvedValueOnce([mockNftId1]);
			mockErc721TokenInventory.mockResolvedValueOnce([]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockErc721TokenInventory).toHaveBeenCalledTimes(2);

				expect(get(nftStore)).toEqual([mockNft1]);
			});
		});

		it('should remove erc1155 nfts from nft store', async () => {
			const mockNft1 = {
				...mockValidErc1155Nft,
				id: mockNftId1,
				collection: {
					...mockValidErc1155Nft.collection,
					address: NYAN_CAT_TOKEN.address,
					network: NYAN_CAT_TOKEN.network
				}
			};
			const mockNft2 = {
				...mockValidErc1155Nft,
				id: mockNftId2,
				collection: {
					...mockValidErc1155Nft.collection,
					address: NYAN_CAT_TOKEN.address,
					network: NYAN_CAT_TOKEN.network
				}
			};
			const mockNft3 = {
				...mockValidErc1155Nft,
				id: mockNftId3,
				collection: {
					...mockValidErc1155Nft.collection,
					address: BUILD_AN_APE_TOKEN.address,
					network: BUILD_AN_APE_TOKEN.network
				}
			};

			nftStore.addAll([mockNft1, mockNft2, mockNft3]);

			erc1155CustomTokensStore.setAll([
				{ data: mockedEnabledNyanToken, certified: false },
				{ data: mockedEnabledApeToken, certified: false }
			]);

			mockGetNftIdsForOwner.mockResolvedValueOnce([{ id: mockNftId1, balance: 2 }]);
			mockGetNftIdsForOwner.mockResolvedValueOnce([]);

			render(LoaderNfts);

			await waitFor(() => {
				expect(mockGetNftIdsForOwner).toHaveBeenCalledTimes(2);

				expect(get(nftStore)).toEqual([mockNft1]);
			});
		});
	});
});
