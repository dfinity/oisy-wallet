import type { CustomToken } from '$declarations/backend/backend.did';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import type { InfuraErc721Provider } from '$eth/providers/infura-erc721.providers';
import * as infuraProvidersModule from '$eth/providers/infura-erc721.providers';
import { loadCustomTokens, loadErc721Tokens } from '$eth/services/erc721.services';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc721Metadata } from '$eth/types/erc721';
import { listCustomTokens } from '$lib/api/backend.api';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

vi.mock('$eth/providers/infura-erc721.providers', () => ({
	infuraErc721Providers: vi.fn()
}));

describe('erc721.services', () => {
	const mockCustomTokens: CustomToken[] = [
		{
			version: toNullable(1n),
			enabled: true,
			token: {
				Erc721: {
					chain_id: ETHEREUM_NETWORK.chainId,
					token_address: mockEthAddress
				}
			},
			state: toNullable()
		},
		{
			version: toNullable(2n),
			enabled: true,
			token: {
				Erc721: {
					chain_id: BASE_NETWORK.chainId,
					token_address: mockEthAddress2.toUpperCase()
				}
			},
			state: toNullable()
		},
		{
			version: toNullable(),
			enabled: false,
			token: {
				Erc721: {
					chain_id: POLYGON_AMOY_NETWORK.chainId,
					token_address: mockEthAddress3
				}
			},
			state: toNullable()
		}
	];

	const mockMetadata1: Erc721Metadata = {
		name: 'Test Token',
		symbol: 'MetadataTTK',
		decimals: 0,
		icon: 'https://example.com/icon.png'
	};

	const mockMetadata2: Erc721Metadata = {
		name: 'Test Token 2',
		symbol: 'MetadataTTK2',
		decimals: 0
	};

	const expectedCustomTokens = [
		{
			certified: true,
			data: {
				standard: 'erc721',
				category: 'custom',
				version: 1n,
				enabled: true,
				network: ETHEREUM_NETWORK,
				address: mockEthAddress,
				decimals: 0,
				name: mockMetadata1.name,
				symbol: mockMetadata1.symbol,
				icon: mockMetadata1.icon
			}
		},
		{
			certified: true,
			data: {
				standard: 'erc721',
				category: 'custom',
				version: 2n,
				enabled: true,
				network: BASE_NETWORK,
				address: mockEthAddress2.toUpperCase(),
				decimals: mockMetadata2.decimals,
				name: mockMetadata2.name,
				symbol: mockMetadata2.symbol
			}
		},
		{
			certified: true,
			data: {
				standard: 'erc721',
				category: 'custom',
				version: undefined,
				enabled: false,
				network: POLYGON_AMOY_NETWORK,
				address: mockEthAddress3,
				decimals: mockMetadata2.decimals,
				name: mockMetadata2.name,
				symbol: mockMetadata2.symbol
			}
		}
	];

	describe('loadErc721Tokens', () => {
		let infuraProvidersSpy: MockInstance;

		const mockMetadata = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsErrorNoTrace');
			vi.spyOn(toastsStore, 'toastsError');

			erc721CustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokens);

			mockMetadata.mockImplementation(({ address }) =>
				address === mockEthAddress ? mockMetadata1 : mockMetadata2
			);

			infuraProvidersSpy = vi.spyOn(infuraProvidersModule, 'infuraErc721Providers');

			infuraProvidersSpy.mockReturnValue({
				metadata: mockMetadata
			} as unknown as InfuraErc721Provider);
		});

		it('should save the custom tokens in the store', async () => {
			await loadErc721Tokens({ identity: mockIdentity });

			const tokens = get(erc721CustomTokensStore);

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

			await expect(loadErc721Tokens({ identity: mockIdentity })).resolves.not.toThrow();
		});

		it('should not throw error if list custom tokens throws', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await expect(loadErc721Tokens({ identity: mockIdentity })).resolves.not.toThrow();
		});
	});

	describe('loadCustomTokens', () => {
		let infuraProvidersSpy: MockInstance;

		const mockMetadata = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsErrorNoTrace');

			erc721CustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokens);

			mockMetadata.mockImplementation(({ address }) => {
				assert('Erc721' in mockCustomTokens[0].token);

				return address === mockEthAddress ? mockMetadata1 : mockMetadata2;
			});

			infuraProvidersSpy = vi.spyOn(infuraProvidersModule, 'infuraErc721Providers');

			infuraProvidersSpy.mockReturnValue({
				metadata: mockMetadata
			} as unknown as InfuraErc721Provider);
		});

		it('should load custom ERC721 tokens', async () => {
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

		it('should query metadata for the tokens that are not in the default list', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			// query + update
			expect(mockMetadata).toHaveBeenCalledTimes(mockCustomTokens.length * 2);

			// query
			mockCustomTokens.forEach(({ token }, index) => {
				assert('Erc721' in token);

				const {
					Erc721: { token_address }
				} = token;

				expect(infuraProvidersSpy).toHaveBeenNthCalledWith(
					index + 1,
					expectedCustomTokens[index].data.network.id
				);
				expect(mockMetadata).toHaveBeenNthCalledWith(index + 1, {
					address: token_address
				});
			});

			// update
			mockCustomTokens.forEach(({ token }, index) => {
				assert('Erc721' in token);

				const {
					Erc721: { token_address }
				} = token;

				expect(infuraProvidersSpy).toHaveBeenNthCalledWith(
					index + 1 + mockCustomTokens.length,
					expectedCustomTokens[index].data.network.id
				);
				expect(mockMetadata).toHaveBeenNthCalledWith(index + 1 + mockCustomTokens.length, {
					address: token_address
				});
			});
		});

		it('should save custom ERC721 tokens to store', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			const tokens = get(erc721CustomTokensStore);

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
			erc721CustomTokensStore.setAll([
				{ data: { ...SEPOLIA_PEPE_TOKEN, standard: 'erc721', enabled: true }, certified: false }
			]);

			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(erc721CustomTokensStore)).toBeNull();
		});

		it('should display an error toast on error', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await loadCustomTokens({ identity: mockIdentity });

			expect(toastsError).toHaveBeenCalledOnce();
			expect(toastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: en.init.error.erc721_custom_tokens },
				err: mockError
			});
		});

		it('should cache the custom tokens in IDB on update call', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				mockCustomTokens,
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
