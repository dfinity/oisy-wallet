import type { UserToken } from '$declarations/backend/backend.did';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { EURC_TOKEN } from '$env/tokens/tokens-erc20/tokens.eurc.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { ADDITIONAL_ERC20_TOKENS, ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import type { InfuraErc20Provider } from '$eth/providers/infura-erc20.providers';
import * as infuraProvidersModule from '$eth/providers/infura-erc20.providers';
import { loadErc20Tokens, loadErc20UserTokens } from '$eth/services/erc20.services';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20Metadata } from '$eth/types/erc20';
import { listUserTokens } from '$lib/api/backend.api';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsErrorNoTrace } from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('idb-keyval', () => ({
	createStore: vi.fn(() => ({
		/* mock store implementation */
	})),
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn(),
	update: vi.fn()
}));

vi.mock('$lib/api/backend.api', () => ({
	listUserTokens: vi.fn()
}));

vi.mock('$eth/providers/infura-erc20.providers', () => ({
	infuraErc20Providers: vi.fn()
}));

describe('erc20.services', () => {
	const mockUserTokens: UserToken[] = [
		{
			decimals: toNullable(18),
			version: toNullable(1n),
			enabled: toNullable(true),
			chain_id: ETHEREUM_NETWORK.chainId,
			contract_address: mockEthAddress,
			symbol: toNullable('TTK')
		},
		{
			decimals: toNullable(18),
			version: toNullable(2n),
			enabled: toNullable(),
			chain_id: BASE_NETWORK.chainId,
			contract_address: mockEthAddress2.toUpperCase(),
			symbol: toNullable('TTK2')
		},
		{
			decimals: toNullable(18),
			version: toNullable(),
			enabled: toNullable(false),
			chain_id: POLYGON_AMOY_NETWORK.chainId,
			contract_address: mockEthAddress3,
			symbol: toNullable('TTK3')
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

			erc20DefaultTokensStore.reset();
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
	});
});
