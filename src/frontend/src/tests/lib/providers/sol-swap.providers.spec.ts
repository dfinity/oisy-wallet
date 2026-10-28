import type * as lifiEnv from '$env/rest/lifi.env';
import type * as nearIntentsEnv from '$env/rest/near-intents.env';
import { solSwapProviders } from '$lib/providers/sol-swap.providers';
import { SwapProvider } from '$lib/types/swap';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('sol-swap.providers', () => {
	describe('LI.FI entry', () => {
		it('should be registered by default', () => {
			expect(solSwapProviders.find(({ key }) => key === SwapProvider.LIFI)).toBeDefined();
		});

		describe('with the flag off', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.doMock('$env/rest/lifi.env', async (importOriginal) => ({
					...(await importOriginal<typeof lifiEnv>()),
					LIFI_SWAP_ENABLED: false
				}));
			});

			afterEach(() => {
				vi.doUnmock('$env/rest/lifi.env');
				vi.resetModules();
			});

			it('should not be registered', async () => {
				const { solSwapProviders: providers } = await import('$lib/providers/sol-swap.providers');

				expect(providers.find(({ key }) => key === SwapProvider.LIFI)).toBeUndefined();
			});
		});

		describe('with the flag on', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.doMock('$env/rest/lifi.env', async (importOriginal) => ({
					...(await importOriginal<typeof lifiEnv>()),
					LIFI_SWAP_ENABLED: true
				}));
			});

			afterEach(() => {
				vi.doUnmock('$env/rest/lifi.env');
				vi.resetModules();
			});

			// Network ids are symbols, so the tokens come from the same module graph as the registry.
			const load = async () => {
				const [
					{ solSwapProviders: providers },
					{ fetchLifiSwapQuote },
					{ BASE_ETH_TOKEN },
					{ SOLANA_TOKEN }
				] = await Promise.all([
					import('$lib/providers/sol-swap.providers'),
					import('$lib/services/lifi-swap.services'),
					import('$env/tokens/tokens-evm/tokens-base/tokens.eth.env'),
					import('$env/tokens/tokens.sol.env')
				]);

				const entry = providers.find(({ key }) => key === SwapProvider.LIFI);

				assertNonNullish(entry);

				return { entry, fetchLifiSwapQuote, baseEthToken: BASE_ETH_TOKEN, solToken: SOLANA_TOKEN };
			};

			it('should register LI.FI as an enabled provider of the Solana registry', async () => {
				const { entry, fetchLifiSwapQuote } = await load();

				expect(entry.isEnabled).toBeTruthy();
				expect(entry.getQuote).toBe(fetchLifiSwapQuote);
			});

			// Without a list the entry would count as a wildcard, and every enabled SPL token would be
			// selectable as a source while LI.FI quotes none.
			it('should declare an empty source list, so the Solana source picker is unchanged', async () => {
				const { entry } = await load();

				await expect(entry.getSupportedTokens?.()).resolves.toEqual(new Set());
			});

			it('should offer every Solana destination for an EVM source', async () => {
				const { entry, baseEthToken } = await load();

				expect(
					entry.getSupportedDestinations({
						sourceToken: baseEthToken,
						supportedSourceTokens: new Set(),
						findProviderSourceTokens: () => undefined
					})
				).toStrictEqual({ sol: 'any' });
			});

			it('should offer nothing for a Solana source', async () => {
				const { entry, solToken } = await load();

				expect(
					entry.getSupportedDestinations({
						sourceToken: solToken,
						supportedSourceTokens: new Set(),
						findProviderSourceTokens: () => undefined
					})
				).toBeUndefined();
			});

			// The entry's empty source list and its `'any'` wildcard, through the same steps as the swap
			// form: a step that started skipping providers whose list lacks the source would drop every
			// EVM → Solana destination.
			describe('through the registries', () => {
				beforeEach(() => {
					// NEAR Intents offers Solana destinations too; on, it would hide the loss of LI.FI's.
					vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
						...(await importOriginal<typeof nearIntentsEnv>()),
						NEAR_INTENTS_SWAP_ENABLED: false,
						NEAR_INTENTS_BTC_SWAP_ENABLED: false,
						NEAR_INTENTS_XRP_SWAP_ENABLED: false
					}));
					// Registries of other source categories, which have no part in an EVM source.
					vi.doMock('$lib/providers/swap.providers', () => ({ swapProviders: [] }));
					vi.doMock('$lib/providers/icp-bridge-swap.providers', () => ({ icpBridgeProviders: [] }));
					vi.doMock('$lib/providers/btc-swap.providers', () => ({ btcSwapProviders: [] }));
					vi.doMock('$lib/providers/xrp-swap.providers', () => ({ xrpSwapProviders: [] }));
				});

				afterEach(() => {
					vi.doUnmock('$env/rest/near-intents.env');
					vi.doUnmock('$lib/providers/swap.providers');
					vi.doUnmock('$lib/providers/icp-bridge-swap.providers');
					vi.doUnmock('$lib/providers/btc-swap.providers');
					vi.doUnmock('$lib/providers/xrp-swap.providers');
				});

				it('should offer Solana tokens for an EVM source', async () => {
					const [
						{ loadSwapSupportedTokens },
						{ swapSupportedTokensStore },
						{ computeReceiveSupportedTokens, filterSwapTokens },
						{ BASE_ETH_TOKEN },
						{ SOLANA_TOKEN }
					] = await Promise.all([
						import('$lib/services/swap-supported-tokens.services'),
						import('$lib/stores/swap-supported-tokens.store'),
						import('$lib/utils/swap-tokens-filter.utils'),
						import('$env/tokens/tokens-evm/tokens-base/tokens.eth.env'),
						import('$env/tokens/tokens.sol.env')
					]);

					await loadSwapSupportedTokens({ identity: mockIdentity });

					const supported = get(swapSupportedTokensStore);

					assertNonNullish(supported);

					const supportedData = computeReceiveSupportedTokens({
						sourceToken: BASE_ETH_TOKEN,
						providers: supported.providers
					});

					expect(
						filterSwapTokens({ tokens: [{ ...SOLANA_TOKEN, enabled: true }], supportedData })
					).toHaveLength(1);
				});
			});
		});
	});
});
