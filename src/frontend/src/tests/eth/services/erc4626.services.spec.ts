import type { CustomToken } from '$declarations/backend/backend.did';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ERC4626_TOKENS } from '$env/tokens/tokens.erc4626.env';
import type { InfuraErc4626Provider } from '$eth/providers/infura-erc4626.providers';
import * as infuraErc4626ProvidersModule from '$eth/providers/infura-erc4626.providers';
import * as erc20ServicesModule from '$eth/services/erc20.services';
import { loadCustomErc4626Tokens, loadErc4626Tokens } from '$eth/services/erc4626.services';
import { erc4626CustomTokensStore } from '$eth/stores/erc4626-custom-tokens.store';
import { erc4626DefaultTokensStore } from '$eth/stores/erc4626-default-tokens.store';
import { listCustomTokens } from '$lib/api/backend.api';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCustomTokensErc4626 } from '$tests/mocks/custom-tokens.mock';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

vi.mock('$eth/providers/infura-erc4626.providers', () => ({
	infuraErc4626Providers: vi.fn()
}));

vi.mock('$eth/services/erc20.services', () => ({
	safeLoadMetadata: vi.fn()
}));

vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { InfuraProvider: provider };
});

vi.mock('ethers/contract', () => {
	const contract = vi.fn();
	contract.prototype.convertToAssets = vi.fn();
	return { Contract: contract };
});

describe('erc4626.services', () => {
	const mockMetadata1 = {
		name: 'Test Vault',
		symbol: 'vTEST',
		decimals: 8,
		icon: 'https://example.com/icon.png'
	};

	const mockMetadata2 = {
		name: 'Test Vault 2',
		symbol: 'vTEST2',
		decimals: 6
	};

	const mockAssetAddress1 = '0xassetAddress1';
	const mockAssetAddress2 = '0xassetAddress2';
	const mockAssetDecimals1 = 6;

	const expectedCustomTokens = [
		{
			certified: true,
			data: {
				standard: { code: 'erc4626' },
				category: 'custom',
				version: 1n,
				allowExternalContentSource: undefined,
				enabled: true,
				network: ETHEREUM_NETWORK,
				address: mockEthAddress,
				decimals: mockMetadata1.decimals,
				name: mockMetadata1.name,
				symbol: mockMetadata1.symbol,
				icon: mockMetadata1.icon,
				assetAddress: mockAssetAddress1,
				assetDecimals: mockAssetDecimals1
			}
		},
		{
			certified: true,
			data: {
				standard: { code: 'erc4626' },
				category: 'custom',
				version: 2n,
				allowExternalContentSource: true,
				enabled: true,
				network: BASE_NETWORK,
				address: mockEthAddress2.toUpperCase(),
				decimals: mockMetadata2.decimals,
				name: mockMetadata2.name,
				symbol: mockMetadata2.symbol,
				icon: undefined,
				assetAddress: mockAssetAddress2,
				assetDecimals: 18
			}
		},
		{
			certified: true,
			data: {
				standard: { code: 'erc4626' },
				category: 'custom',
				version: undefined,
				allowExternalContentSource: false,
				enabled: false,
				network: POLYGON_AMOY_NETWORK,
				address: mockEthAddress3,
				decimals: mockMetadata2.decimals,
				name: mockMetadata2.name,
				symbol: mockMetadata2.symbol,
				icon: undefined,
				assetAddress: '',
				assetDecimals: 18
			}
		}
	];

	let infuraProvidersSpy: MockInstance;

	const mockMetadataFn = vi.fn();
	const mockGetAssetAddress = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		vi.spyOn(toastsStore, 'toastsError');

		vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokensErc4626);

		mockMetadataFn.mockImplementation(({ address }) =>
			'Erc4626' in mockCustomTokensErc4626[0].token &&
			address === mockCustomTokensErc4626[0].token.Erc4626.token_address
				? mockMetadata1
				: mockMetadata2
		);

		mockGetAssetAddress.mockImplementation((address: string) => {
			if (
				'Erc4626' in mockCustomTokensErc4626[0].token &&
				address === mockCustomTokensErc4626[0].token.Erc4626.token_address
			) {
				return mockAssetAddress1;
			}
			if (
				'Erc4626' in mockCustomTokensErc4626[1].token &&
				address === mockCustomTokensErc4626[1].token.Erc4626.token_address
			) {
				return mockAssetAddress2;
			}
		});

		vi.mocked(erc20ServicesModule.safeLoadMetadata).mockImplementation(async ({ address }) => {
			if (address === mockAssetAddress1) {
				return await Promise.resolve({
					name: 'USDC',
					symbol: 'USDC',
					decimals: mockAssetDecimals1
				});
			}
		});

		infuraProvidersSpy = vi.spyOn(infuraErc4626ProvidersModule, 'infuraErc4626Providers');

		infuraProvidersSpy.mockReturnValue({
			metadata: mockMetadataFn,
			getAssetAddress: mockGetAssetAddress
		} as unknown as InfuraErc4626Provider);
	});

	describe('loadErc4626Tokens', () => {
		beforeEach(() => {
			erc4626DefaultTokensStore.reset();
			erc4626CustomTokensStore.resetAll();
		});

		it('should save the default tokens in the store', async () => {
			await loadErc4626Tokens({ identity: mockIdentity });

			const tokens = get(erc4626DefaultTokensStore);

			ERC4626_TOKENS.forEach((token) => {
				expect(tokens).toContainEqual(token);
			});
		});

		it('should save the custom tokens in the store', async () => {
			await loadErc4626Tokens({ identity: mockIdentity });

			const tokens = get(erc4626CustomTokensStore);

			const expected = expectedCustomTokens.map((token, index) => ({
				...token,
				data: {
					...token.data,
					id: (tokens ?? [])[index].data.id
				}
			}));

			expect(tokens).toStrictEqual(expected);
		});

		it('should not throw error if metadata throws', async () => {
			vi.mocked(mockMetadataFn).mockRejectedValue(new Error('Error loading metadata'));

			await expect(loadErc4626Tokens({ identity: mockIdentity })).resolves.not.toThrowError();
		});

		it('should not throw error if list custom tokens throws', async () => {
			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

			await expect(loadErc4626Tokens({ identity: mockIdentity })).resolves.not.toThrowError();
		});
	});

	describe('loadCustomErc4626Tokens', () => {
		beforeEach(() => {
			erc4626CustomTokensStore.resetAll();
		});

		it('should load custom ERC4626 tokens', async () => {
			await loadCustomErc4626Tokens({ identity: mockIdentity });

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
			await loadCustomErc4626Tokens({ identity: mockIdentity });

			// query + update
			expect(mockMetadataFn).toHaveBeenCalledTimes(mockCustomTokensErc4626.length * 2);
		});

		it('should not query metadata for the tokens that are in the default list', async () => {
			const [defaultToken] = ERC4626_TOKENS;

			const additionalCustomToken: CustomToken = {
				version: toNullable(),
				enabled: true,
				token: {
					Erc4626: {
						chain_id: defaultToken.network.chainId,
						token_address: defaultToken.address
					}
				},
				section: toNullable(),
				allow_external_content_source: toNullable()
			};

			vi.mocked(listCustomTokens).mockResolvedValue([
				...mockCustomTokensErc4626,
				additionalCustomToken
			]);

			await loadCustomErc4626Tokens({ identity: mockIdentity });

			expect(mockMetadataFn).not.toHaveBeenCalledWith({
				address: defaultToken.address
			});

			// query + update (only for non-default tokens)
			expect(mockMetadataFn).toHaveBeenCalledTimes(mockCustomTokensErc4626.length * 2);
		});

		it('should save custom ERC4626 tokens to store', async () => {
			await loadCustomErc4626Tokens({ identity: mockIdentity });

			const tokens = get(erc4626CustomTokensStore);

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

		it('should use the static metadata for custom tokens that match default tokens', async () => {
			const [defaultToken] = ERC4626_TOKENS;

			const additionalCustomToken: CustomToken = {
				version: toNullable(17n),
				enabled: true,
				token: {
					Erc4626: {
						chain_id: defaultToken.network.chainId,
						token_address: defaultToken.address
					}
				},
				section: toNullable(),
				allow_external_content_source: toNullable()
			};

			vi.mocked(listCustomTokens).mockResolvedValue([
				...mockCustomTokensErc4626,
				additionalCustomToken
			]);

			await loadCustomErc4626Tokens({ identity: mockIdentity });

			const tokens = get(erc4626CustomTokensStore);

			const expected = [
				{
					certified: true,
					data: {
						...defaultToken,
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
			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

			await loadCustomErc4626Tokens({ identity: mockIdentity });

			expect(get(erc4626CustomTokensStore)).toBeNull();
		});

		it('should display the toast on error', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await loadCustomErc4626Tokens({ identity: mockIdentity });

			expect(toastsError).toHaveBeenCalledOnce();
			expect(toastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: en.init.error.erc4626_custom_tokens },
				err: mockError
			});
		});

		it('should load asset address and asset decimals for custom tokens', async () => {
			await loadCustomErc4626Tokens({ identity: mockIdentity });

			const tokens = get(erc4626CustomTokensStore);

			expect(tokens?.[0].data.assetAddress).toBe(mockAssetAddress1);
			expect(tokens?.[0].data.assetDecimals).toBe(mockAssetDecimals1);

			expect(tokens?.[1].data.assetAddress).toBe(mockAssetAddress2);
			expect(tokens?.[1].data.assetDecimals).toBe(18);

			expect(tokens?.[2].data.assetAddress).toBe('');
			expect(tokens?.[2].data.assetDecimals).toBe(18);
		});

		it('should not throw if getAssetAddress fails', async () => {
			mockGetAssetAddress.mockRejectedValue(new Error('Error fetching asset'));

			await expect(loadCustomErc4626Tokens({ identity: mockIdentity })).resolves.not.toThrowError();
		});

		it('should cache the custom tokens in IDB on update call', async () => {
			const idbKeyval = await import('idb-keyval');

			await loadCustomErc4626Tokens({ identity: mockIdentity });

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				mockCustomTokensErc4626,
				expect.any(Object)
			);
		});
	});
});
