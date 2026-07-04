import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	AlchemyProvider,
	alchemyProviders,
	initMinedTransactionsListener
} from '$eth/providers/alchemy.providers';
import type { AlchemyProviderContract, AlchemyProviderContracts } from '$eth/types/alchemy';
import type { Erc1155Metadata } from '$eth/types/erc1155';
import type { EthereumNetwork } from '$eth/types/network';
import { MediaStatusEnum } from '$lib/enums/media-status';
import type { Nft, OwnedContract } from '$lib/types/nft';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mapTokenToCollection } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockEthTransaction } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { SvelteMap } from 'svelte/reactivity';
import * as viemMod from 'viem';
import { createPublicClient, http, type PublicClient } from 'viem';
import type { MockInstance } from 'vitest';

vi.mock(import('viem'), async (importOriginal) => {
	const actual = await importOriginal();

	const mockWaitForTransactionReceipt = vi.fn();
	const mockGetTransaction = vi.fn();

	const mockPublicClient = {
		waitForTransactionReceipt: mockWaitForTransactionReceipt,
		getTransaction: mockGetTransaction
	} as unknown as PublicClient;

	return {
		...actual,
		createPublicClient: vi.fn().mockReturnValue(mockPublicClient),
		http: vi.fn().mockImplementation((url) => url),
		__mocks: {
			mockWaitForTransactionReceipt,
			mockGetTransaction
		}
	};
});

vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-api-key'
}));

/* eslint-disable local-rules/prefer-object-params -- mirrors the native (type, listener) WebSocket signature */
class MockWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSED = 3;
	static instances: MockWebSocket[] = [];

	url: string;
	readyState = MockWebSocket.CONNECTING;
	send = vi.fn();
	close = vi.fn(() => {
		this.readyState = MockWebSocket.CLOSED;
		this.dispatch('close');
	});

	private readonly listeners: Record<string, ((ev?: unknown) => void)[]> = {};

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
	}

	addEventListener(type: string, cb: (ev?: unknown) => void) {
		(this.listeners[type] ??= []).push(cb);
	}

	removeEventListener(type: string, cb: (ev?: unknown) => void) {
		this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== cb);
	}

	dispatch(type: string, ev?: unknown) {
		// Model the real lifecycle: `open`/`close` update readyState before listeners run, so
		// `send`'s `readyState === OPEN` guard behaves as it would in the browser.
		if (type === 'open') {
			this.readyState = MockWebSocket.OPEN;
		}

		if (type === 'close') {
			this.readyState = MockWebSocket.CLOSED;
		}

		[...(this.listeners[type] ?? [])].forEach((cb) => cb(ev));
	}
}
/* eslint-enable local-rules/prefer-object-params */

describe('alchemy.providers', () => {
	const ALCHEMY_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	it('should create the correct map of providers', () => {
		networks.forEach(({ providers: { alchemyJsonRpcUrl, viemChain } }, index) => {
			expect(http).toHaveBeenNthCalledWith(index + 1, `${alchemyJsonRpcUrl}/${ALCHEMY_API_KEY}`);
			expect(createPublicClient).toHaveBeenNthCalledWith(index + 1, {
				chain: viemChain,
				transport: `${alchemyJsonRpcUrl}/${ALCHEMY_API_KEY}`
			});
		});
	});

	describe('wait', () => {
		let mockWaitForTransactionReceipt: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			({ mockWaitForTransactionReceipt } = (
				viemMod as unknown as {
					__mocks: { mockWaitForTransactionReceipt: ReturnType<typeof vi.fn> };
				}
			).__mocks);

			mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });
		});

		it('should wait for the transaction receipt', async () => {
			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await provider.wait(mockEthAddress);

			expect(mockWaitForTransactionReceipt).toHaveBeenCalledExactlyOnceWith({
				hash: mockEthAddress
			});
		});

		it('should throw an error if the input is not an hash', async () => {
			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(provider.wait('notAnHash')).rejects.toThrow(
				'Invalid transaction hash while waiting for transaction receipt: notAnHash'
			);
		});
	});

	describe('getTransaction', () => {
		let mockGetTransaction: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			({ mockGetTransaction } = (
				viemMod as unknown as {
					__mocks: { mockGetTransaction: ReturnType<typeof vi.fn> };
				}
			).__mocks);

			mockGetTransaction.mockResolvedValue({
				...mockEthTransaction,
				blockNumber: 123n,
				gas: 21000n,
				input: '0x123456789'
			});
		});

		it('should return the transaction details', async () => {
			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const transaction = await provider.getTransaction(mockEthAddress);

			expect(transaction).toStrictEqual({
				...mockEthTransaction,
				blockNumber: 123,
				gasLimit: 21000n,
				data: '0x123456789'
			});

			expect(mockGetTransaction).toHaveBeenCalledExactlyOnceWith({
				hash: mockEthAddress
			});
		});

		it('should handle a nullish response', async () => {
			mockGetTransaction.mockResolvedValue(undefined);

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const transaction = await provider.getTransaction(mockEthAddress);

			expect(transaction).toBeUndefined();

			expect(mockGetTransaction).toHaveBeenCalledExactlyOnceWith({
				hash: mockEthAddress
			});
		});

		it('should throw an error if the input is not an hash', async () => {
			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(provider.getTransaction('notAnHash')).rejects.toThrow(
				'Invalid transaction hash while fetching transaction details: notAnHash'
			);
		});
	});

	describe('getNftsByOwner', () => {
		const mockApiResponse = {
			ownedNfts: [
				{
					tokenId: '1',
					name: 'Name1',
					image: { originalUrl: 'https://download.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '1',
					contract: {
						address: mockValidErc1155Token.address,
						tokenType: 'ERC1155',
						openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' }
					}
				},
				{
					tokenId: '2',
					name: 'Name2',
					image: { originalUrl: 'https://download2.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '4',
					contract: {
						address: mockValidErc1155Token.address,
						tokenType: 'ERC1155',
						openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' }
					}
				},
				{
					tokenId: '3',
					name: 'Name3',
					image: { originalUrl: 'https://download3.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '4',
					contract: {
						address: mockValidErc1155Token.address,
						tokenType: 'ERC1155',
						openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' }
					}
				},
				{
					tokenId: '4',
					name: 'Name4',
					image: { originalUrl: 'https://download4.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '4',
					contract: {
						address: mockValidErc1155Token.address,
						tokenType: 'ERC1155',
						openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' }
					}
				}
			]
		};

		const expectedTokenIds: Nft[] = [
			{
				id: parseNftId('1'),
				name: 'Name1',
				imageUrl: 'https://download.com',
				balance: 1,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token),
					bannerImageUrl: 'https://download.com',
					bannerMediaStatus: MediaStatusEnum.OK
				},
				description: 'lorem ipsum',
				mediaStatus: {
					image: MediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE,
					thumbnail: MediaStatusEnum.INVALID_DATA
				}
			},
			{
				id: parseNftId('2'),
				name: 'Name2',
				imageUrl: 'https://download2.com',
				balance: 4,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token),
					bannerImageUrl: 'https://download.com',
					bannerMediaStatus: MediaStatusEnum.OK
				},
				description: 'lorem ipsum',
				mediaStatus: {
					image: MediaStatusEnum.OK,
					thumbnail: MediaStatusEnum.INVALID_DATA
				}
			},
			{
				id: parseNftId('3'),
				name: 'Name3',
				imageUrl: 'https://download3.com',
				balance: 4,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token),
					bannerImageUrl: 'https://download.com',
					bannerMediaStatus: MediaStatusEnum.OK
				},
				description: 'lorem ipsum',
				mediaStatus: {
					image: MediaStatusEnum.FILESIZE_LIMIT_EXCEEDED,
					thumbnail: MediaStatusEnum.INVALID_DATA
				}
			},
			{
				id: parseNftId('4'),
				name: 'Name4',
				imageUrl: 'https://download4.com',
				balance: 4,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token),
					bannerImageUrl: 'https://download.com',
					bannerMediaStatus: MediaStatusEnum.OK
				},
				description: 'lorem ipsum',
				mediaStatus: {
					image: MediaStatusEnum.OK,
					thumbnail: MediaStatusEnum.INVALID_DATA
				}
			}
		];

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(SvelteMap.prototype, 'get').mockReturnValue(undefined); // invalidate cache
		});

		const mockFetchForNftsByOwner = (response: unknown) => {
			global.fetch = vi
				.fn()
				// First call: the NFT API fetch for getNFTsForOwner
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(response)
				})
				// Subsequent calls: HEAD requests for media status checks
				.mockResolvedValueOnce({
					headers: {
						get: (h: string) =>
							h === 'Content-Type' ? 'something' : h === 'Content-Length' ? '5000' : null
					}
				})
				.mockResolvedValueOnce({
					headers: {
						get: () => null
					}
				})
				.mockResolvedValueOnce({
					headers: {
						get: (h: string) =>
							h === 'Content-Type' ? 'image/png' : h === 'Content-Length' ? '1000000000' : null
					}
				})
				.mockResolvedValueOnce({
					headers: {
						get: (h: string) =>
							h === 'Content-Type' ? 'image/png' : h === 'Content-Length' ? '5000' : null
					}
				});
		};

		it('should fetch and map nfts correctly', async () => {
			mockFetchForNftsByOwner(mockApiResponse);

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nfts = await provider.getNftsByOwner({
				address: mockEthAddress,
				tokens: [mockValidErc1155Token]
			});

			expect(global.fetch).toHaveBeenCalled();
			expect(nfts).toStrictEqual(expectedTokenIds);
		});

		it('should only map existing data', async () => {
			mockFetchForNftsByOwner({
				ownedNfts: [
					{
						tokenId: '1',
						raw: { metadata: {} },
						contract: { address: mockValidErc1155Token.address, tokenType: 'Erc1155' }
					},
					{
						tokenId: '2',
						raw: { metadata: {} },
						contract: { address: mockValidErc1155Token.address, tokenType: 'Erc1155' }
					}
				]
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nfts = await provider.getNftsByOwner({
				address: mockEthAddress,
				tokens: [mockValidErc1155Token]
			});

			expect(global.fetch).toHaveBeenCalled();

			expect(nfts).toStrictEqual([
				{
					id: parseNftId('1'),
					collection: {
						...mapTokenToCollection(mockValidErc1155Token)
					},
					mediaStatus: {
						image: MediaStatusEnum.INVALID_DATA,
						thumbnail: MediaStatusEnum.INVALID_DATA
					}
				},
				{
					id: parseNftId('2'),
					collection: {
						...mapTokenToCollection(mockValidErc1155Token)
					},
					mediaStatus: {
						image: MediaStatusEnum.INVALID_DATA,
						thumbnail: MediaStatusEnum.INVALID_DATA
					}
				}
			]);
		});

		it('should throw an error', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(
				provider.getNftsByOwner({ address: mockEthAddress, tokens: [mockValidErc1155Token] })
			).rejects.toThrow('Alchemy NFT API error: 500 Internal Server Error');
		});
	});

	describe('getNftMetadata', () => {
		const mockApiResponse = {
			tokenId: '1',
			name: 'Name1',
			image: { originalUrl: 'https://download1.com' },
			description: 'lorem ipsum',
			raw: { metadata: {} },
			contract: {
				address: mockValidErc1155Token.address,
				tokenType: 'ERC1155',
				openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' }
			}
		};

		const mockTokenId = parseNftId('1');

		const expectedNft: Nft = {
			id: mockTokenId,
			name: 'Name1',
			imageUrl: 'https://download1.com',
			collection: {
				...mapTokenToCollection(mockValidErc1155Token),
				bannerImageUrl: 'https://download.com',
				bannerMediaStatus: MediaStatusEnum.OK
			},
			description: 'lorem ipsum',
			mediaStatus: {
				image: MediaStatusEnum.OK,
				thumbnail: MediaStatusEnum.INVALID_DATA
			}
		};

		const mockFetchForNftMetadata = (response: unknown) => {
			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(response)
				})
				.mockResolvedValue({
					headers: {
						get: () => null
					}
				});
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(SvelteMap.prototype, 'get').mockReturnValue(undefined); // invalidate cache
		});

		it('should fetch and map NFT correctly', async () => {
			mockFetchForNftMetadata(mockApiResponse);

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nft = await provider.getNftMetadata({
				token: mockValidErc1155Token,
				tokenId: mockTokenId
			});

			expect(global.fetch).toHaveBeenCalled();
			expect(nft).toStrictEqual(expectedNft);
		});

		it('should only map existing data', async () => {
			mockFetchForNftMetadata({
				tokenId: '1',
				raw: { metadata: {} },
				contract: { address: mockValidErc1155Token.address, tokenType: 'Erc1155' }
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nft = await provider.getNftMetadata({
				token: mockValidErc1155Token,
				tokenId: mockTokenId
			});

			expect(global.fetch).toHaveBeenCalled();

			expect(nft).toStrictEqual({
				id: parseNftId('1'),
				collection: {
					...mapTokenToCollection(mockValidErc1155Token)
				},
				mediaStatus: {
					image: MediaStatusEnum.INVALID_DATA,
					thumbnail: MediaStatusEnum.INVALID_DATA
				}
			});
		});

		it('should throw an error', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(
				provider.getNftMetadata({ token: mockValidErc1155Token, tokenId: mockTokenId })
			).rejects.toThrow('Alchemy NFT API error: 500 Internal Server Error');
		});

		it('should use cached values when available', async () => {
			// Svelte map already has cached value from previous test runs
			vi.spyOn(SvelteMap.prototype, 'get').mockRestore();

			mockFetchForNftMetadata(mockApiResponse);

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await provider.getNftMetadata({ token: mockValidErc1155Token, tokenId: mockTokenId });

			// Reset fetch mock so the second call can only succeed from cache
			global.fetch = vi.fn();

			const nft = await provider.getNftMetadata({
				token: mockValidErc1155Token,
				tokenId: mockTokenId
			});

			expect(nft).toStrictEqual({
				id: parseNftId('1'),
				collection: {
					...mapTokenToCollection(mockValidErc1155Token)
				},
				mediaStatus: {
					image: MediaStatusEnum.INVALID_DATA,
					thumbnail: MediaStatusEnum.INVALID_DATA
				}
			});

			expect(global.fetch).not.toHaveBeenCalled();
		});
	});

	describe('getTokensForOwner', () => {
		const mockApiResponse: AlchemyProviderContracts = {
			contracts: [
				{
					isSpam: false,
					address: mockEthAddress,
					tokenType: 'ERC721'
				},
				{
					isSpam: false,
					address: mockEthAddress2,
					tokenType: 'ERC721'
				}
			]
		};

		const expectedContracts: OwnedContract[] = [
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' },
			{ address: mockEthAddress2, isSpam: false, standard: 'erc721' }
		];

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should fetch and map contracts correctly', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockApiResponse)
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const contracts = await provider.getTokensForOwner(mockEthAddress);

			expect(global.fetch).toHaveBeenCalledOnce();

			expect(contracts).toStrictEqual(expectedContracts);
		});

		it('should handle incorrect token types correctly', async () => {
			const updatedMockApiResponse = {
				contracts: [
					...mockApiResponse.contracts,
					{
						isSpam: false,
						address: mockEthAddress,
						tokenType: 'NO_SUPPORTED_NFT_STANDARD'
					}
				]
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(updatedMockApiResponse)
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const contracts = await provider.getTokensForOwner(mockEthAddress);

			expect(global.fetch).toHaveBeenCalledOnce();

			expect(contracts).toStrictEqual(expectedContracts);
		});
	});

	describe('getContractMetadata', () => {
		const mockApiResponse: AlchemyProviderContract = {
			name: 'MyContract',
			symbol: 'MC',
			tokenType: 'ERC721',
			openSeaMetadata: {
				description: 'This is a description',
				collectionName: 'My mega contract'
			}
		};

		const expectedMetadata: Erc1155Metadata = {
			name: 'My mega contract',
			symbol: 'MC',
			decimals: 0,
			description: 'This is a description'
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(SvelteMap.prototype, 'get').mockReturnValue(undefined); // invalidate cache
		});

		it('should fetch and map contract metadata correctly', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockApiResponse)
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const metadata = await provider.getContractMetadata(mockEthAddress);

			expect(global.fetch).toHaveBeenCalledOnce();

			expect(metadata).toStrictEqual(expectedMetadata);
		});

		it('should handle incorrect token type correctly', async () => {
			const updatedMockApiResponse = {
				...mockApiResponse,
				tokenType: 'NO_SUPPORTED_NFT_STANDARD'
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(updatedMockApiResponse)
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(provider.getContractMetadata(mockEthAddress)).rejects.toThrow(
				'Invalid token standard'
			);

			expect(global.fetch).toHaveBeenCalledOnce();
		});

		it('should use cached values when available', async () => {
			// Svelte map already has cached value from previous test runs
			vi.spyOn(SvelteMap.prototype, 'get').mockRestore();

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockApiResponse)
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await provider.getContractMetadata(mockEthAddress);

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						name: 'AnotherContract',
						symbol: 'AC',
						tokenType: 'ERC721',
						openSeaMetadata: {
							description: 'Another description',
							collectionName: 'Another mega contract'
						}
					})
			});

			const metadata = await provider.getContractMetadata(mockEthAddress);

			expect(metadata).toStrictEqual(expectedMetadata);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('should deduplicate concurrent requests for the same address', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockApiResponse)
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const [result1, result2, result3] = await Promise.all([
				provider.getContractMetadata(mockEthAddress),
				provider.getContractMetadata(mockEthAddress),
				provider.getContractMetadata(mockEthAddress)
			]);

			expect(global.fetch).toHaveBeenCalledOnce();
			expect(result1).toStrictEqual(expectedMetadata);
			expect(result2).toStrictEqual(expectedMetadata);
			expect(result3).toStrictEqual(expectedMetadata);
		});
	});

	describe('alchemyProviders', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = alchemyProviders(id);

				expect(provider).toBeInstanceOf(AlchemyProvider);

				expect(provider).toHaveProperty('provider');
				expect(provider).toHaveProperty('nftBaseUrl');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => alchemyProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_alchemy_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});

	describe('subscribeAlchemyWs (via initMinedTransactionsListener)', () => {
		let originalWebSocket: typeof WebSocket;

		const initListener = () =>
			initMinedTransactionsListener({
				listener: vi.fn(),
				networkId: ETHEREUM_NETWORK.id
			});

		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();

			MockWebSocket.instances = [];
			originalWebSocket = global.WebSocket;
			global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
		});

		afterEach(() => {
			global.WebSocket = originalWebSocket;
			vi.useRealTimers();
		});

		it('should subscribe on open', () => {
			initListener();

			expect(MockWebSocket.instances).toHaveLength(1);

			MockWebSocket.instances[0].dispatch('open');

			expect(MockWebSocket.instances[0].send).toHaveBeenCalledOnce();
		});

		it('should reconnect and re-subscribe after an unexpected close', async () => {
			initListener();

			expect(MockWebSocket.instances).toHaveLength(1);

			MockWebSocket.instances[0].dispatch('close');

			// A generous advance covers the (local) reconnect backoff.
			await vi.advanceTimersByTimeAsync(5_000);

			expect(MockWebSocket.instances).toHaveLength(2);

			MockWebSocket.instances[1].dispatch('open');

			expect(MockWebSocket.instances[1].send).toHaveBeenCalledOnce();
		});

		it('should not reconnect after an intentional disconnect', async () => {
			const listener = initListener();

			expect(MockWebSocket.instances).toHaveLength(1);

			await listener.disconnect();
			MockWebSocket.instances[0].dispatch('close');

			await vi.advanceTimersByTimeAsync(60_000);

			expect(MockWebSocket.instances).toHaveLength(1);
		});
	});
});
