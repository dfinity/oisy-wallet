import type { CustomToken } from '$declarations/backend/backend.did';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ERC4626_TOKENS } from '$env/tokens/tokens.erc4626.env';
import type { InfuraErc4626Provider } from '$eth/providers/infura-erc4626.providers';
import * as infuraErc4626ProvidersModule from '$eth/providers/infura-erc4626.providers';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import * as infuraProvidersModule from '$eth/providers/infura.providers';
import * as approveServicesModule from '$eth/services/approve.services';
import * as erc20ServicesModule from '$eth/services/erc20.services';
import {
	depositErc4626,
	loadCustomErc4626Tokens,
	loadErc4626Tokens,
	redeemErc4626,
	toggleErc4626Token,
	withdrawErc4626
} from '$eth/services/erc4626.services';
import { erc4626CustomTokensStore } from '$eth/stores/erc4626-custom-tokens.store';
import { erc4626DefaultTokensStore } from '$eth/stores/erc4626-default-tokens.store';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import { listCustomTokens } from '$lib/api/backend.api';
import * as signerApiModule from '$lib/api/signer.api';
import { signTransaction } from '$lib/api/signer.api';
import { ProgressStepsStake, ProgressStepsUnstake } from '$lib/enums/progress-steps';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Vault } from '$lib/types/vaults';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCustomTokensErc4626 } from '$tests/mocks/custom-tokens.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
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

vi.mock('$lib/api/signer.api', () => ({
	signTransaction: vi.fn()
}));

vi.mock('$lib/services/save-custom-tokens.services', () => ({
	saveCustomTokens: vi.fn()
}));

vi.mock('$lib/utils/wallet.utils', () => ({
	waitAndTriggerWallet: vi.fn()
}));

describe('erc4626.services', () => {
	describe('loading tokens', () => {
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
					tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
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
					assetDecimals: mockAssetDecimals1,
					assetSymbol: 'USDC'
				}
			},
			{
				certified: true,
				data: {
					standard: { code: 'erc4626' },
					category: 'custom',
					tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
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
					assetDecimals: 18,
					assetSymbol: ''
				}
			},
			{
				certified: true,
				data: {
					standard: { code: 'erc4626' },
					category: 'custom',
					tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
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
					assetDecimals: 18,
					assetSymbol: ''
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

				await expect(loadErc4626Tokens({ identity: mockIdentity })).resolves.not.toThrow();
			});

			it('should not throw error if list custom tokens throws', async () => {
				vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

				await expect(loadErc4626Tokens({ identity: mockIdentity })).resolves.not.toThrow();
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
					nullishIdentityErrorMessage: en.auth.error.no_internet_identity
				});
				expect(listCustomTokens).toHaveBeenNthCalledWith(2, {
					identity: mockIdentity,
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

				await expect(loadCustomErc4626Tokens({ identity: mockIdentity })).resolves.not.toThrow();
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

	describe('erc4626 transaction services', () => {
		const mockFrom: EthAddress = mockEthAddress3;
		const mockRawTransaction = '0xsigned_raw_tx';
		const mockNonce = 5;
		const mockDepositGas = 150_000n;

		const mockFeeData = {
			gas: 500_000n,
			maxFeePerGas: 30_000_000_000n,
			maxPriorityFeePerGas: 2_000_000_000n
		};

		const mockVaultAddress = '0x0d877dc7c8fa3ad980dfdb18b48ec9f8768359c4';

		const mockVaultToken = {
			...mockValidErc4626Token,
			address: mockVaultAddress,
			network: ETHEREUM_NETWORK,
			enabled: true
		};

		const mockVault: Vault = {
			token: mockVaultToken,
			apy: '5.5'
		};

		const mockAssetAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

		const mockAssetToken: Erc20Token = {
			...mockValidErc20Token,
			address: mockAssetAddress,
			network: ETHEREUM_NETWORK
		};

		const getTransactionCountSpy = vi.fn();
		const sendTransactionSpy = vi.fn();
		const safeEstimateGasSpy = vi.fn();

		const mockProvider = {
			getTransactionCount: getTransactionCountSpy,
			sendTransaction: sendTransactionSpy,
			safeEstimateGas: safeEstimateGasSpy
		} as unknown as InfuraProvider;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(infuraProvidersModule, 'infuraProviders').mockReturnValue(mockProvider);
			vi.spyOn(signerApiModule, 'signTransaction');

			getTransactionCountSpy.mockResolvedValue(mockNonce);
			sendTransactionSpy.mockResolvedValue({ hash: '0xmockhash' });
			safeEstimateGasSpy.mockResolvedValue(mockDepositGas);

			vi.mocked(signTransaction).mockResolvedValue(mockRawTransaction);
		});

		describe('depositErc4626', () => {
			const mockAmount = 1_000_000n;

			const approveSpy = vi.fn();

			beforeEach(() => {
				approveSpy.mockResolvedValue({ transactionNeededApproval: true, nonce: mockNonce });

				vi.spyOn(approveServicesModule, 'approve').mockImplementation(approveSpy);
			});

			it('should call approve, sign and send transaction', async () => {
				await depositErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assetToken: mockAssetToken,
					amount: mockAmount,
					from: mockFrom,
					...mockFeeData
				});

				expect(approveSpy).toHaveBeenCalledOnce();
				expect(signTransaction).toHaveBeenCalledOnce();
				expect(sendTransactionSpy).toHaveBeenCalledOnce();
			});

			it('should call progress callbacks in order', async () => {
				const progress = vi.fn();

				await depositErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assetToken: mockAssetToken,
					amount: mockAmount,
					from: mockFrom,
					progress,
					...mockFeeData
				});

				expect(progress).toHaveBeenCalledTimes(3);
				expect(progress).toHaveBeenNthCalledWith(1, ProgressStepsStake.APPROVE);
				expect(progress).toHaveBeenNthCalledWith(2, ProgressStepsStake.STAKE);
				expect(progress).toHaveBeenNthCalledWith(3, ProgressStepsStake.UPDATE_UI);
			});

			it('should increment nonce when approval was needed', async () => {
				approveSpy.mockResolvedValue({ transactionNeededApproval: true, nonce: 10 });

				await depositErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assetToken: mockAssetToken,
					amount: mockAmount,
					from: mockFrom,
					...mockFeeData
				});

				expect(signTransaction).toHaveBeenCalledWith(
					expect.objectContaining({
						transaction: expect.objectContaining({
							nonce: 11n
						})
					})
				);
			});

			it('should not increment nonce when approval was not needed', async () => {
				approveSpy.mockResolvedValue({ transactionNeededApproval: false, nonce: 10 });

				await depositErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assetToken: mockAssetToken,
					amount: mockAmount,
					from: mockFrom,
					...mockFeeData
				});

				expect(signTransaction).toHaveBeenCalledWith(
					expect.objectContaining({
						transaction: expect.objectContaining({
							nonce: 10n
						})
					})
				);
			});

			it('should estimate gas for the deposit', async () => {
				await depositErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assetToken: mockAssetToken,
					amount: mockAmount,
					from: mockFrom,
					...mockFeeData
				});

				expect(safeEstimateGasSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						from: mockFrom,
						to: mockVault.token.address
					})
				);
			});

			it('should use estimated gas in the transaction when available', async () => {
				safeEstimateGasSpy.mockResolvedValue(200_000n);

				await depositErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assetToken: mockAssetToken,
					amount: mockAmount,
					from: mockFrom,
					...mockFeeData
				});

				expect(signTransaction).toHaveBeenCalledWith(
					expect.objectContaining({
						transaction: expect.objectContaining({
							gas: 200_000n
						})
					})
				);
			});

			it('should approve the vault contract to spend the asset token', async () => {
				await depositErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assetToken: mockAssetToken,
					amount: mockAmount,
					from: mockFrom,
					...mockFeeData
				});

				expect(approveSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						token: mockAssetToken,
						from: mockFrom,
						to: mockVault.token.address,
						amount: mockAmount
					})
				);
			});

			it('should call infuraProviders with the correct network', async () => {
				await depositErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assetToken: mockAssetToken,
					amount: mockAmount,
					from: mockFrom,
					...mockFeeData
				});

				expect(infuraProvidersModule.infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			});
		});

		describe('withdrawErc4626', () => {
			const mockAssets = 500_000n;

			it('should get nonce, sign and send transaction', async () => {
				await withdrawErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assets: mockAssets,
					from: mockFrom,
					...mockFeeData
				});

				expect(getTransactionCountSpy).toHaveBeenCalledOnce();
				expect(signTransaction).toHaveBeenCalledOnce();
				expect(sendTransactionSpy).toHaveBeenCalledOnce();
			});

			it('should call progress callbacks in order', async () => {
				const progress = vi.fn();

				await withdrawErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assets: mockAssets,
					from: mockFrom,
					progress,
					...mockFeeData
				});

				expect(progress).toHaveBeenCalledTimes(2);
				expect(progress).toHaveBeenNthCalledWith(1, ProgressStepsUnstake.UNSTAKE);
				expect(progress).toHaveBeenNthCalledWith(2, ProgressStepsUnstake.UPDATE_UI);
			});

			it('should send transaction to the vault contract address', async () => {
				await withdrawErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assets: mockAssets,
					from: mockFrom,
					...mockFeeData
				});

				expect(signTransaction).toHaveBeenCalledWith(
					expect.objectContaining({
						transaction: expect.objectContaining({
							to: mockVault.token.address
						})
					})
				);
			});

			it('should use the nonce from getTransactionCount', async () => {
				getTransactionCountSpy.mockResolvedValue(42);

				await withdrawErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assets: mockAssets,
					from: mockFrom,
					...mockFeeData
				});

				expect(signTransaction).toHaveBeenCalledWith(
					expect.objectContaining({
						transaction: expect.objectContaining({
							nonce: 42n
						})
					})
				);
			});

			it('should call infuraProviders with the correct network', async () => {
				await withdrawErc4626({
					identity: mockIdentity,
					vault: mockVault,
					assets: mockAssets,
					from: mockFrom,
					...mockFeeData
				});

				expect(infuraProvidersModule.infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			});
		});

		describe('redeemErc4626', () => {
			const mockShares = 500_000n;

			it('should get nonce, sign and send transaction', async () => {
				await redeemErc4626({
					identity: mockIdentity,
					vault: mockVault,
					shares: mockShares,
					from: mockFrom,
					...mockFeeData
				});

				expect(getTransactionCountSpy).toHaveBeenCalledOnce();
				expect(signTransaction).toHaveBeenCalledOnce();
				expect(sendTransactionSpy).toHaveBeenCalledOnce();
			});

			it('should call progress callbacks in order', async () => {
				const progress = vi.fn();

				await redeemErc4626({
					identity: mockIdentity,
					vault: mockVault,
					shares: mockShares,
					from: mockFrom,
					progress,
					...mockFeeData
				});

				expect(progress).toHaveBeenCalledTimes(2);
				expect(progress).toHaveBeenNthCalledWith(1, ProgressStepsUnstake.UNSTAKE);
				expect(progress).toHaveBeenNthCalledWith(2, ProgressStepsUnstake.UPDATE_UI);
			});

			it('should send transaction to the vault contract address', async () => {
				await redeemErc4626({
					identity: mockIdentity,
					vault: mockVault,
					shares: mockShares,
					from: mockFrom,
					...mockFeeData
				});

				expect(signTransaction).toHaveBeenCalledWith(
					expect.objectContaining({
						transaction: expect.objectContaining({
							to: mockVault.token.address
						})
					})
				);
			});

			it('should use the nonce from getTransactionCount', async () => {
				getTransactionCountSpy.mockResolvedValue(42);

				await redeemErc4626({
					identity: mockIdentity,
					vault: mockVault,
					shares: mockShares,
					from: mockFrom,
					...mockFeeData
				});

				expect(signTransaction).toHaveBeenCalledWith(
					expect.objectContaining({
						transaction: expect.objectContaining({
							nonce: 42n
						})
					})
				);
			});

			it('should call infuraProviders with the correct network', async () => {
				await redeemErc4626({
					identity: mockIdentity,
					vault: mockVault,
					shares: mockShares,
					from: mockFrom,
					...mockFeeData
				});

				expect(infuraProvidersModule.infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			});
		});

		describe('toggleErc4626Token', () => {
			beforeEach(() => {
				vi.mocked(saveCustomTokens).mockResolvedValue(undefined);
			});

			it('should call saveCustomTokens with the provided enabled value and correct token data', async () => {
				await toggleErc4626Token({
					token: mockVaultToken,
					identity: mockIdentity,
					enabled: true
				});

				expect(saveCustomTokens).toHaveBeenCalledWith({
					identity: mockIdentity,
					tokens: [
						{
							enabled: true,
							version: undefined,
							address: mockVaultToken.address,
							chainId: mockVaultToken.network.chainId,
							networkKey: 'Erc4626'
						}
					]
				});
			});

			it('should not call saveCustomTokens when identity is nullish', async () => {
				await toggleErc4626Token({
					token: mockVaultToken,
					identity: undefined,
					enabled: true
				});

				expect(saveCustomTokens).not.toHaveBeenCalled();
			});
		});
	});
});
