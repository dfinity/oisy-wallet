import type { CustomToken } from '$declarations/backend/backend.did';
import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
import { EXT_BUILTIN_TOKENS } from '$env/tokens/tokens-ext/tokens.ext.env';
import { ICRC7_BUILTIN_TOKENS } from '$env/tokens/tokens-icrc7/tokens.icrc7.env';
import type { AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as alchemyProvidersModule from '$eth/providers/alchemy.providers';
import * as extTokenApi from '$icp/api/ext-v2-token.api';
import * as icrc7Api from '$icp/api/icrc7.api';
import LoaderCollections from '$lib/components/loaders/LoaderCollections.svelte';
import * as saveCustomTokens from '$lib/services/save-custom-tokens.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { backendCustomTokens } from '$lib/stores/backend-custom-tokens.store';
import { emit } from '$lib/utils/events.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

describe('LoaderCollections', () => {
	let alchemyProvidersSpy: MockInstance;
	let extGetTokensByOwnerSpy: MockInstance;
	let icrc7GetTokensByOwnerSpy: MockInstance;
	let saveCustomTokensSpy: MockInstance;

	const mockGetTokensForOwner = vi.fn();

	const mockEventCallback = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		alchemyProvidersSpy = vi.spyOn(alchemyProvidersModule, 'alchemyProviders');
		alchemyProvidersSpy.mockReturnValue({
			getTokensForOwner: mockGetTokensForOwner
		} as unknown as AlchemyProvider);

		extGetTokensByOwnerSpy = vi.spyOn(extTokenApi, 'getTokensByOwner');
		extGetTokensByOwnerSpy.mockResolvedValue([]);

		icrc7GetTokensByOwnerSpy = vi.spyOn(icrc7Api, 'getTokensByOwner');
		icrc7GetTokensByOwnerSpy.mockResolvedValue([]);

		saveCustomTokensSpy = vi.spyOn(saveCustomTokens, 'saveCustomTokens');
		saveCustomTokensSpy.mockResolvedValue(undefined);

		mockAuthStore();

		ethAddressStore.set({ data: mockEthAddress, certified: false });

		mockGetTokensForOwner.mockResolvedValue([]);

		backendCustomTokens.set([]);
	});

	it('should add new ERC collections', async () => {
		const networks = [...SUPPORTED_ETHEREUM_MAINNET_NETWORKS, ...SUPPORTED_EVM_MAINNET_NETWORKS];

		mockGetTokensForOwner.mockResolvedValue([
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' },
			{ address: mockEthAddress, isSpam: false, standard: 'erc1155' }
		]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			expect(saveCustomTokensSpy).toHaveBeenCalledExactlyOnceWith({
				tokens: networks.flatMap((network) => [
					{
						address: mockEthAddress,
						chainId: network.chainId,
						networkKey: 'Erc721',
						enabled: true
					},
					{
						address: mockEthAddress,
						chainId: network.chainId,
						networkKey: 'Erc1155',
						enabled: true
					}
				]),
				identity: mockIdentity
			});
		});
	});

	it('should not add new EXT collections by default', async () => {
		render(LoaderCollections);

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).not.toHaveBeenCalled();
			expect(saveCustomTokensSpy).not.toHaveBeenCalled();
		});
	});

	it('should not add new ICRC-7 collections by default', async () => {
		render(LoaderCollections);

		await waitFor(() => {
			expect(icrc7GetTokensByOwnerSpy).not.toHaveBeenCalled();
			expect(saveCustomTokensSpy).not.toHaveBeenCalled();
		});
	});

	it('should add new EXT collections if the event is triggered', async () => {
		extGetTokensByOwnerSpy.mockResolvedValueOnce([1, 2, 3]);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).toHaveBeenCalledTimes(EXT_BUILTIN_TOKENS.length);

			EXT_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(extGetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId,
					certified: false
				});
			});

			expect(saveCustomTokensSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						canisterId: EXT_BUILTIN_TOKENS[0].canisterId,
						networkKey: 'ExtV2',
						enabled: true
					}
				]
			});

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should add new ICRC-7 collections if the event is triggered', async () => {
		icrc7GetTokensByOwnerSpy.mockResolvedValueOnce([1n, 2n, 3n]);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(icrc7GetTokensByOwnerSpy).toHaveBeenCalledTimes(ICRC7_BUILTIN_TOKENS.length);

			ICRC7_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(icrc7GetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: { owner: mockPrincipal, subaccount: [] },
					canisterId,
					certified: false
				});
			});

			expect(saveCustomTokensSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						canisterId: ICRC7_BUILTIN_TOKENS[0].canisterId,
						networkKey: 'Icrc7',
						enabled: true
					}
				]
			});

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should not add ERC collections if there are no new collections', async () => {
		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];

		mockGetTokensForOwner.mockResolvedValue([]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();
		});
	});

	it('should not add EXT collections if there are no new collections', async () => {
		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).toHaveBeenCalledTimes(EXT_BUILTIN_TOKENS.length);

			EXT_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(extGetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId,
					certified: false
				});
			});

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should not add ICRC-7 collections if there are no new collections', async () => {
		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(icrc7GetTokensByOwnerSpy).toHaveBeenCalledTimes(ICRC7_BUILTIN_TOKENS.length);

			ICRC7_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(icrc7GetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: { owner: mockPrincipal, subaccount: [] },
					canisterId,
					certified: false
				});
			});

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should not add existing ERC collections', async () => {
		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];

		const existingErc721CustomTokens: CustomToken[] = networks.map((network) => ({
			token: {
				Erc721: {
					token_address: mockEthAddress,
					chain_id: network.chainId
				}
			},
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(false),
			allowed_external_content_source_urls: toNullable()
		}));
		const existingErc1155CustomTokens: CustomToken[] = networks.map((network) => ({
			token: {
				Erc1155: {
					token_address: mockEthAddress,
					chain_id: network.chainId
				}
			},
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(true),
			allowed_external_content_source_urls: toNullable()
		}));

		backendCustomTokens.set([...existingErc721CustomTokens, ...existingErc1155CustomTokens]);

		mockGetTokensForOwner.mockResolvedValue([
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' },
			{ address: mockEthAddress, isSpam: false, standard: 'erc1155' }
		]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();
		});
	});

	it('should not add existing EXT collections', async () => {
		const existingExtCustomToken: CustomToken = {
			token: {
				ExtV2: {
					canister_id: Principal.fromText(EXT_BUILTIN_TOKENS[0].canisterId)
				}
			},
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(false),
			allowed_external_content_source_urls: toNullable()
		};

		backendCustomTokens.set([existingExtCustomToken]);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).toHaveBeenCalledTimes(EXT_BUILTIN_TOKENS.length - 1);

			EXT_BUILTIN_TOKENS.slice(1).forEach(({ canisterId }, index) => {
				expect(extGetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId,
					certified: false
				});
			});

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should not add existing ICRC-7 collections', async () => {
		const existingIcrc7CustomToken: CustomToken = {
			token: {
				Icrc7: {
					canister_id: Principal.fromText(ICRC7_BUILTIN_TOKENS[0].canisterId)
				}
			},
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(false),
			allowed_external_content_source_urls: toNullable()
		};

		backendCustomTokens.set([existingIcrc7CustomToken]);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(icrc7GetTokensByOwnerSpy).toHaveBeenCalledTimes(ICRC7_BUILTIN_TOKENS.length - 1);

			ICRC7_BUILTIN_TOKENS.slice(1).forEach(({ canisterId }, index) => {
				expect(icrc7GetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: { owner: mockPrincipal, subaccount: [] },
					canisterId,
					certified: false
				});
			});

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should handle EXT error gracefully', async () => {
		const mockError = new Error('EXT error');
		extGetTokensByOwnerSpy.mockRejectedValueOnce(mockError);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).toHaveBeenCalledTimes(EXT_BUILTIN_TOKENS.length);

			EXT_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(extGetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId,
					certified: false
				});
			});

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				`Error fetching EXT tokens from canister ${EXT_BUILTIN_TOKENS[0].canisterId}:`,
				mockError
			);

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should handle ICRC-7 error gracefully', async () => {
		const mockError = new Error('ICRC-7 error');
		icrc7GetTokensByOwnerSpy.mockRejectedValueOnce(mockError);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(icrc7GetTokensByOwnerSpy).toHaveBeenCalledTimes(ICRC7_BUILTIN_TOKENS.length);

			ICRC7_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(icrc7GetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: { owner: mockPrincipal, subaccount: [] },
					canisterId,
					certified: false
				});
			});

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				`Error fetching ICRC-7 tokens from canister ${ICRC7_BUILTIN_TOKENS[0].canisterId}:`,
				mockError
			);

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});
});
