import type { CustomToken, UserToken } from '$declarations/backend/backend.did';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { EURC_TOKEN } from '$env/tokens/tokens-erc20/tokens.eurc.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { ADDITIONAL_ERC20_TOKENS, ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import type { InfuraErc20Provider } from '$eth/providers/infura-erc20.providers';
import * as infuraProvidersModule from '$eth/providers/infura-erc20.providers';
import {
	loadCustomTokens,
	loadErc20Tokens,
	loadErc20UserTokens
} from '$eth/services/erc20.services';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20Metadata } from '$eth/types/erc20';
import { listCustomTokens, listUserTokens } from '$lib/api/backend.api';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError, toastsErrorNoTrace } from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockUserTokens } from '$tests/mocks/user-tokens.mock';
import { toNullable } from '@dfinity/utils';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api', () => ({
	listUserTokens: vi.fn(),
	listCustomTokens: vi.fn()
}));

vi.mock('$eth/providers/infura-erc20.providers', () => ({
	infuraErc20Providers: vi.fn()
}));

describe('erc20.services', () => {
	const mockCustomTokens: CustomToken[] = [
		{
			version: toNullable(1n),
			enabled: true,
			token: {
				Erc20: {
					chain_id: ETHEREUM_NETWORK.chainId,
					token_address: mockEthAddress
				}
			},
			section: toNullable(),
			allow_external_content_source: toNullable()
		},
		{
			version: toNullable(2n),
			enabled: true,
			token: {
				Erc20: {
					chain_id: BASE_NETWORK.chainId,
					token_address: mockEthAddress2.toUpperCase()
				}
			},
			section: toNullable(),
			allow_external_content_source: toNullable()
		},
		{
			version: toNullable(),
			enabled: false,
			token: {
				Erc20: {
					chain_id: POLYGON_AMOY_NETWORK.chainId,
					token_address: mockEthAddress3
				}
			},
			section: toNullable(),
			allow_external_content_source: toNullable()
		}
	];

	const mockMetadata1: Erc20Metadata = {
		name: 'Test Token',
		symbol: 'MetadataTTK',
		decimals: 3,
		icon: 'https://example.com/icon.png'
	};

	const mockMetadata2: Erc20Metadata = {
		name: 'Test Token 2',
		symbol: 'MetadataTTK2',
		decimals: 4
	};

	const expectedUserTokens = [
		{
			certified: true,
			data: {
				standard: 'erc20',
				category: 'custom',
				exchange: 'erc20',
				version: 1n,
				enabled: true,
				network: ETHEREUM_NETWORK,
				address: mockEthAddress,
				decimals: mockMetadata1.decimals,
				name: mockMetadata1.name,
				symbol: mockMetadata1.symbol,
				icon: mockMetadata1.icon
			}
		},
		{
			certified: true,
			data: {
				standard: 'erc20',
				category: 'custom',
				exchange: 'erc20',
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
				standard: 'erc20',
				category: 'custom',
				exchange: 'erc20',
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

	const expectedCustomTokens = [
		{
			certified: true,
			data: {
				standard: 'erc20',
				category: 'custom',
				exchange: 'erc20',
				version: 1n,
				enabled: true,
				network: ETHEREUM_NETWORK,
				address: mockEthAddress,
				decimals: mockMetadata1.decimals,
				name: mockMetadata1.name,
				symbol: mockMetadata1.symbol,
				icon: mockMetadata1.icon
			}
		},
		{
			certified: true,
			data: {
				standard: 'erc20',
				category: 'custom',
				exchange: 'erc20',
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
				standard: 'erc20',
				category: 'custom',
				exchange: 'erc20',
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

	describe('loadErc20Tokens', () => {
		let infuraProvidersSpy: MockInstance;

		const mockMetadata = vi.fn();

		const mockMetadata1: Erc20Metadata = {
			name: 'Test Token',
			symbol: 'MetadataTTK',
			decimals: 3,
			icon: 'https://example.com/icon.png'
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsErrorNoTrace');
			vi.spyOn(toastsStore, 'toastsError');

			erc20DefaultTokensStore.reset();
			erc20UserTokensStore.resetAll();
			erc20CustomTokensStore.resetAll();

			vi.mocked(listUserTokens).mockResolvedValue(mockUserTokens);
			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokens);

			mockMetadata.mockImplementation(({ address }) =>
				address === mockUserTokens[0].contract_address ? mockMetadata1 : mockMetadata2
			);

			infuraProvidersSpy = vi.spyOn(infuraProvidersModule, 'infuraErc20Providers');

			infuraProvidersSpy.mockReturnValue({
				metadata: mockMetadata
			} as unknown as InfuraErc20Provider);
		});

		it('should save the default tokens in the store', async () => {
			await loadErc20Tokens({ identity: mockIdentity });

			const tokens = get(erc20DefaultTokensStore);

			[...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS, ...ADDITIONAL_ERC20_TOKENS].forEach((token) => {
				expect(tokens).toContainEqual(token);
			});
		});

		it('should save the user tokens in the store', async () => {
			await loadErc20Tokens({ identity: mockIdentity });

			const tokens = get(erc20UserTokensStore);

			const expected = expectedUserTokens.map((token, index) => ({
				...token,
				data: {
					...token.data,
					id: (tokens ?? [])[index].data.id
				}
			}));

			expect(tokens).toEqual(expected);
		});

		it('should save the custom tokens in the store', async () => {
			await loadErc20Tokens({ identity: mockIdentity });

			const tokens = get(erc20CustomTokensStore);

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

			await expect(loadErc20Tokens({ identity: mockIdentity })).resolves.not.toThrow();
		});

		it('should not throw error if list user tokens throws', async () => {
			const mockError = new Error('Error loading user tokens');
			vi.mocked(listUserTokens).mockRejectedValue(mockError);

			await expect(loadErc20Tokens({ identity: mockIdentity })).resolves.not.toThrow();
		});

		it('should not throw error if list custom tokens throws', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await expect(loadErc20Tokens({ identity: mockIdentity })).resolves.not.toThrow();
		});

		it('should reset both tokens stores on error', async () => {
			erc20DefaultTokensStore.add(SEPOLIA_PEPE_TOKEN);
			erc20UserTokensStore.setAll([{ data: { ...EURC_TOKEN, enabled: true }, certified: false }]);

			vi.mocked(mockMetadata).mockRejectedValue(new Error('Error loading metadata'));

			await loadErc20Tokens({ identity: mockIdentity });

			expect(get(erc20DefaultTokensStore)).toBeUndefined();
			expect(get(erc20UserTokensStore)).toBeNull();
		});

		it('should display the toast on error', async () => {
			const mockError = new Error('Error loading metadata');
			vi.mocked(mockMetadata).mockRejectedValue(mockError);

			await loadErc20Tokens({ identity: mockIdentity });

			expect(toastsErrorNoTrace).toHaveBeenCalledTimes(2);
			expect(toastsErrorNoTrace).toHaveBeenNthCalledWith(1, {
				msg: { text: en.init.error.erc20_contracts },
				err: mockError
			});
			expect(toastsErrorNoTrace).toHaveBeenNthCalledWith(2, {
				msg: { text: en.init.error.erc20_user_tokens },
				err: mockError
			});
		});
	});

	describe('loadErc20UserTokens', () => {
		let infuraProvidersSpy: MockInstance;

		const mockMetadata = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsErrorNoTrace');

			erc20UserTokensStore.resetAll();

			vi.mocked(listUserTokens).mockResolvedValue(mockUserTokens);

			mockMetadata.mockImplementation(({ address }) =>
				address === mockUserTokens[0].contract_address ? mockMetadata1 : mockMetadata2
			);

			infuraProvidersSpy = vi.spyOn(infuraProvidersModule, 'infuraErc20Providers');

			infuraProvidersSpy.mockReturnValue({
				metadata: mockMetadata
			} as unknown as InfuraErc20Provider);
		});

		it('should load user ERC20 tokens', async () => {
			await loadErc20UserTokens({ identity: mockIdentity });

			// query + update
			expect(listUserTokens).toHaveBeenCalledTimes(2);
			expect(listUserTokens).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
			expect(listUserTokens).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				certified: true,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should query metadata for the tokens that are not in the default list', async () => {
			await loadErc20UserTokens({ identity: mockIdentity });

			// query + update
			expect(mockMetadata).toHaveBeenCalledTimes(mockUserTokens.length * 2);

			// query
			mockUserTokens.forEach(({ contract_address }, index) => {
				expect(infuraProvidersSpy).toHaveBeenNthCalledWith(
					index + 1,
					expectedUserTokens[index].data.network.id
				);
				expect(mockMetadata).toHaveBeenNthCalledWith(index + 1, {
					address: contract_address
				});
			});

			// update
			mockUserTokens.forEach(({ contract_address }, index) => {
				expect(infuraProvidersSpy).toHaveBeenNthCalledWith(
					index + 1 + mockUserTokens.length,
					expectedUserTokens[index].data.network.id
				);
				expect(mockMetadata).toHaveBeenNthCalledWith(index + 1 + mockUserTokens.length, {
					address: contract_address
				});
			});
		});

		it('should not query metadata for the tokens that are in the default list', async () => {
			const additionalUserToken: UserToken = {
				decimals: toNullable(3),
				version: toNullable(),
				enabled: toNullable(),
				chain_id: ETHEREUM_NETWORK.chainId,
				contract_address: EURC_TOKEN.address,
				symbol: toNullable(EURC_TOKEN.symbol)
			};

			vi.mocked(listUserTokens).mockResolvedValue([...mockUserTokens, additionalUserToken]);

			await loadErc20UserTokens({ identity: mockIdentity });

			expect(mockMetadata).not.toHaveBeenCalledWith({
				address: additionalUserToken.contract_address
			});

			// query + update
			expect(mockMetadata).toHaveBeenCalledTimes(mockUserTokens.length * 2);

			// query
			mockUserTokens.forEach(({ contract_address }, index) => {
				expect(infuraProvidersSpy).toHaveBeenNthCalledWith(
					index + 1,
					expectedUserTokens[index].data.network.id
				);
				expect(mockMetadata).toHaveBeenNthCalledWith(index + 1, {
					address: contract_address
				});
			});

			// update
			mockUserTokens.forEach(({ contract_address }, index) => {
				expect(infuraProvidersSpy).toHaveBeenNthCalledWith(
					index + 1 + mockUserTokens.length,
					expectedUserTokens[index].data.network.id
				);
				expect(mockMetadata).toHaveBeenNthCalledWith(index + 1 + mockUserTokens.length, {
					address: contract_address
				});
			});
		});

		it('should save user ERC20 tokens to store', async () => {
			await loadErc20UserTokens({ identity: mockIdentity });

			const tokens = get(erc20UserTokensStore);

			expect(tokens).toEqual(
				expectedUserTokens.map((token, index) => ({
					...token,
					data: {
						...token.data,
						id: (tokens ?? [])[index].data.id
					}
				}))
			);
		});

		it('should use the static metadata for the user tokens that are already among the default tokens', async () => {
			const additionalUserToken: UserToken = {
				decimals: toNullable(3),
				version: toNullable(17n),
				enabled: toNullable(),
				chain_id: ETHEREUM_NETWORK.chainId,
				contract_address: EURC_TOKEN.address,
				symbol: toNullable('Not-EURC')
			};

			vi.mocked(listUserTokens).mockResolvedValue([...mockUserTokens, additionalUserToken]);

			await loadErc20UserTokens({ identity: mockIdentity });

			const tokens = get(erc20UserTokensStore);

			const expected = [
				...expectedUserTokens.map((token, index) => ({
					...token,
					data: {
						...token.data,
						id: (tokens ?? [])[index].data.id
					}
				})),
				{
					certified: true,
					data: {
						...EURC_TOKEN,
						category: 'custom',
						version: 17n,
						enabled: true
					}
				}
			];

			expect(tokens).toEqual(expected);
		});

		it('should reset token store on error', async () => {
			erc20UserTokensStore.setAll([
				{ data: { ...SEPOLIA_PEPE_TOKEN, enabled: true }, certified: false }
			]);

			vi.mocked(listUserTokens).mockRejectedValue(new Error('Error loading user tokens'));

			await loadErc20UserTokens({ identity: mockIdentity });

			expect(get(erc20UserTokensStore)).toBeNull();
		});

		it('should display the toast on error', async () => {
			const mockError = new Error('Error loading user tokens');
			vi.mocked(listUserTokens).mockRejectedValue(mockError);

			await loadErc20UserTokens({ identity: mockIdentity });

			expect(toastsErrorNoTrace).toHaveBeenCalledOnce();
			expect(toastsErrorNoTrace).toHaveBeenNthCalledWith(1, {
				msg: { text: en.init.error.erc20_user_tokens },
				err: mockError
			});
		});

		it('should cache the custom tokens in IDB on update call', async () => {
			await loadErc20UserTokens({ identity: mockIdentity });

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				mockUserTokens,
				expect.any(Object)
			);
		});

		it('should fetch the cached custom tokens in IDB on query call', async () => {
			await loadErc20UserTokens({ identity: mockIdentity, useCache: true });

			expect(idbKeyval.get).toHaveBeenCalledOnce();
			expect(idbKeyval.get).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				expect.any(Object)
			);
		});
	});

	describe('loadCustomTokens', () => {
		let infuraProvidersSpy: MockInstance;

		const mockMetadata = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsErrorNoTrace');

			erc20CustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokens);

			mockMetadata.mockImplementation(({ address }) => {
				assert('Erc20' in mockCustomTokens[0].token);

				return address === mockCustomTokens[0].token.Erc20.token_address
					? mockMetadata1
					: mockMetadata2;
			});

			infuraProvidersSpy = vi.spyOn(infuraProvidersModule, 'infuraErc20Providers');

			infuraProvidersSpy.mockReturnValue({
				metadata: mockMetadata
			} as unknown as InfuraErc20Provider);
		});

		it('should load custom ERC20 tokens', async () => {
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
				assert('Erc20' in token);

				const {
					Erc20: { token_address }
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
				assert('Erc20' in token);

				const {
					Erc20: { token_address }
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

		it('should not query metadata for the tokens that are in the default list', async () => {
			const additionalCustomToken: CustomToken = {
				version: toNullable(),
				enabled: true,
				token: {
					Erc20: {
						chain_id: ETHEREUM_NETWORK.chainId,
						token_address: EURC_TOKEN.address
					}
				},
				section: toNullable(),
				allow_external_content_source: toNullable()
			};
			assert('Erc20' in additionalCustomToken.token);

			vi.mocked(listCustomTokens).mockResolvedValue([...mockCustomTokens, additionalCustomToken]);

			await loadCustomTokens({ identity: mockIdentity });

			expect(mockMetadata).not.toHaveBeenCalledWith({
				address: additionalCustomToken.token.Erc20.token_address
			});

			// query + update
			expect(mockMetadata).toHaveBeenCalledTimes(mockCustomTokens.length * 2);

			// query
			mockCustomTokens.forEach(({ token }, index) => {
				assert('Erc20' in token);

				const {
					Erc20: { token_address }
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
				assert('Erc20' in token);

				const {
					Erc20: { token_address }
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

		it('should save custom ERC20 tokens to store', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			const tokens = get(erc20CustomTokensStore);

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

		it('should use the static metadata for the custom tokens that are already among the default tokens', async () => {
			const additionalCustomToken: CustomToken = {
				version: toNullable(17n),
				enabled: true,
				token: {
					Erc20: {
						chain_id: ETHEREUM_NETWORK.chainId,
						token_address: EURC_TOKEN.address
					}
				},
				section: toNullable(),
				allow_external_content_source: toNullable()
			};

			vi.mocked(listCustomTokens).mockResolvedValue([...mockCustomTokens, additionalCustomToken]);

			await loadCustomTokens({ identity: mockIdentity });

			const tokens = get(erc20CustomTokensStore);

			const expected = [
				{
					certified: true,
					data: {
						...EURC_TOKEN,
						version: 17n,
						enabled: true
					}
				},
				...expectedCustomTokens.map((token, index) => ({
					...token,
					data: {
						...token.data,
						id: (tokens ?? [])[index + 1].data.id
					}
				}))
			];

			expect(tokens).toEqual(expected);
		});

		it('should reset token store on error', async () => {
			erc20CustomTokensStore.setAll([
				{ data: { ...SEPOLIA_PEPE_TOKEN, enabled: true }, certified: false }
			]);

			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(erc20CustomTokensStore)).toBeNull();
		});

		it('should display the toast on error', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await loadCustomTokens({ identity: mockIdentity });

			expect(toastsError).toHaveBeenCalledOnce();
			expect(toastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: en.init.error.erc20_custom_tokens },
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
