import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import type { AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as alchemyProvidersModule from '$eth/providers/alchemy.providers';
import { loadCustomTokens, loadErc1155Tokens } from '$eth/services/erc1155.services';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import type { Erc1155Metadata } from '$eth/types/erc1155';
import { listCustomTokens } from '$lib/api/backend.api';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SUBCONTEXT_NFT
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCustomTokensErc1155 } from '$tests/mocks/custom-tokens.mock';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('erc1155.services', () => {
	const mockMetadata1: Erc1155Metadata = {
		name: 'Test Token',
		symbol: 'MetadataTTK',
		decimals: 0
	};

	const mockMetadata2: Erc1155Metadata = {
		name: 'Test Token 2',
		symbol: 'MetadataTTK2',
		decimals: 0
	};

	const expectedCustomTokens = [
		{
			certified: true,
			data: {
				standard: 'erc1155',
				category: 'custom',
				version: 1n,
				enabled: true,
				network: ETHEREUM_NETWORK,
				address: mockEthAddress,
				decimals: 0,
				name: mockMetadata1.name,
				symbol: mockMetadata1.symbol
			}
		},
		{
			certified: true,
			data: {
				standard: 'erc1155',
				category: 'custom',
				version: 2n,
				enabled: true,
				network: BASE_NETWORK,
				address: mockEthAddress2.toUpperCase(),
				decimals: 0,
				name: mockMetadata2.name,
				symbol: mockMetadata2.symbol
			}
		},
		{
			certified: true,
			data: {
				standard: 'erc1155',
				category: 'custom',
				version: undefined,
				enabled: false,
				network: POLYGON_AMOY_NETWORK,
				address: mockEthAddress3,
				decimals: 0,
				name: mockMetadata2.name,
				symbol: mockMetadata2.symbol
			}
		}
	];

	describe('loadErc1155Tokens', () => {
		let alchemyProvidersSpy: MockInstance;

		const mockMetadata = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsErrorNoTrace');
			vi.spyOn(toastsStore, 'toastsError');

			erc1155CustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokensErc1155);

			mockMetadata.mockImplementation((address) =>
				address === mockEthAddress ? mockMetadata1 : mockMetadata2
			);

			alchemyProvidersSpy = vi.spyOn(alchemyProvidersModule, 'alchemyProviders');

			alchemyProvidersSpy.mockReturnValue({
				getContractMetadata: mockMetadata
			} as unknown as AlchemyProvider);
		});

		it('should save the custom tokens in the store', async () => {
			await loadErc1155Tokens({ identity: mockIdentity });

			const tokens = get(erc1155CustomTokensStore);

			const expected = expectedCustomTokens.map((token, index) => ({
				...token,
				data: {
					...token.data,
					id: (tokens ?? [])[index].data.id
				}
			}));

			expect(tokens).toEqual(expected);
		});

		it('should not throw error if metadata throws', async () => {
			const mockError = new Error('Error loading metadata');
			vi.mocked(mockMetadata).mockRejectedValue(mockError);

			await expect(loadErc1155Tokens({ identity: mockIdentity })).resolves.not.toThrow();

			expect(get(erc1155CustomTokensStore)).toStrictEqual([]);

			// query + update
			expect(trackEvent).toHaveBeenCalledTimes(mockCustomTokensErc1155.length * 2);

			mockCustomTokensErc1155.forEach(({ token }, index) => {
				assert('Erc1155' in token);

				const {
					Erc1155: { token_address: address }
				} = token;

				const {
					network: { id: networkId }
				} = expectedCustomTokens[index].data;

				expect(trackEvent).toHaveBeenNthCalledWith(index + 1, {
					name: PLAUSIBLE_EVENTS.LOAD_CUSTOM_TOKENS,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
						event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_NFT.ERC1155,
						token_address: address,
						token_network: `${networkId.description}`
					},
					warning: `Error loading metadata for custom ERC1155 token ${address} on network ${networkId.description}. ${mockError}`
				});

				expect(trackEvent).toHaveBeenNthCalledWith(index + 1 + mockCustomTokensErc1155.length, {
					name: PLAUSIBLE_EVENTS.LOAD_CUSTOM_TOKENS,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
						event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_NFT.ERC1155,
						token_address: address,
						token_network: `${networkId.description}`
					},
					warning: `Error loading metadata for custom ERC1155 token ${address} on network ${networkId.description}. ${mockError}`
				});
			});
		});

		it('should not throw error if list custom tokens throws', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await expect(loadErc1155Tokens({ identity: mockIdentity })).resolves.not.toThrow();
		});
	});

	describe('loadCustomTokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsErrorNoTrace');

			erc1155CustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokensErc1155);
		});

		it('should load custom ERC1155 tokens', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			// query + update
			expect(listCustomTokens).toHaveBeenCalledTimes(2);
			expect(listCustomTokens).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
			expect(listCustomTokens).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				certified: true,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should save custom ERC1155 tokens to store', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			const tokens = get(erc1155CustomTokensStore);

			expect(tokens).toEqual(
				expectedCustomTokens.map((token, index) => ({
					...token,
					data: {
						...token.data,
						id: (tokens ?? [])[index].data.id
					}
				}))
			);
		});

		it('should reset token store on error', async () => {
			erc1155CustomTokensStore.setAll([
				{ data: { ...SEPOLIA_PEPE_TOKEN, standard: 'erc1155', enabled: true }, certified: false }
			]);

			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(erc1155CustomTokensStore)).toBeNull();
		});

		it('should display an error toast on error', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await loadCustomTokens({ identity: mockIdentity });

			expect(toastsError).toHaveBeenCalledOnce();
			expect(toastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: en.init.error.erc1155_custom_tokens },
				err: mockError
			});
		});

		it('should cache the custom tokens in IDB on update call', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				mockCustomTokensErc1155,
				expect.any(Object)
			);
		});

		it('should fetch the cached custom tokens in IDB on query call', async () => {
			await loadCustomTokens({ identity: mockIdentity, useCache: true });

			expect(idbKeyval.get).toHaveBeenCalledOnce();
			expect(idbKeyval.get).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				expect.any(Object)
			);
		});
	});
});
