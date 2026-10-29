import type * as lifiEnv from '$env/rest/lifi.env';
import type * as nearIntentsEnv from '$env/rest/near-intents.env';
import { solSwapProviders } from '$lib/providers/sol-swap.providers';
import { SwapProvider } from '$lib/types/swap';
import type * as splDerived from '$sol/derived/spl.derived';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { assertNonNullish } from '@dfinity/utils';
import { get, readable } from 'svelte/store';

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
				const [{ solSwapProviders: providers }, { BASE_ETH_TOKEN }, { SOLANA_TOKEN }] =
					await Promise.all([
						import('$lib/providers/sol-swap.providers'),
						import('$env/tokens/tokens-evm/tokens-base/tokens.eth.env'),
						import('$env/tokens/tokens.sol.env')
					]);

				const entry = providers.find(({ key }) => key === SwapProvider.LIFI);

				assertNonNullish(entry);

				return { entry, baseEthToken: BASE_ETH_TOKEN, solToken: SOLANA_TOKEN };
			};

			it('should register LI.FI as an enabled provider of the Solana registry', async () => {
				const { entry } = await load();

				expect(entry.isEnabled).toBeTruthy();
			});

			describe('its quote', () => {
				const fetchLifiSwapQuote = vi.fn();

				beforeEach(() => {
					fetchLifiSwapQuote.mockReset().mockResolvedValue(undefined);
					vi.doMock('$lib/services/lifi-swap.services', () => ({
						fetchLifiSwapQuote,
						lifiSolSupportedTokens: vi.fn()
					}));
				});

				afterEach(() => {
					vi.doUnmock('$lib/services/lifi-swap.services');
				});

				it('should ask LI.FI for an EVM source', async () => {
					const { entry, baseEthToken, solToken } = await load();
					const params = {
						sourceToken: baseEthToken,
						destinationToken: solToken,
						amount: 1n,
						userAddress: mockEthAddress,
						recipientAddress: mockSolAddress,
						slippage: 0.5
					};

					await entry.getQuote(params);

					expect(fetchLifiSwapQuote).toHaveBeenCalledExactlyOnceWith(params);
				});

				// The request refuses a Solana source with an EVM destination.
				it('should ask LI.FI for a Solana source', async () => {
					const { entry, solToken } = await load();
					const params = {
						sourceToken: solToken,
						destinationToken: solToken,
						amount: 1n,
						userAddress: mockSolAddress,
						recipientAddress: mockSolAddress,
						slippage: 0.5
					};

					await entry.getQuote(params);

					expect(fetchLifiSwapQuote).toHaveBeenCalledExactlyOnceWith(params);
				});
			});

			// A list rather than a wildcard, which would also admit the devnet and local SOL tokens.
			it('should list the Solana mainnet tokens as sources', async () => {
				const [{ entry, solToken }, { nativeSwapTokenIdentifier }] = await Promise.all([
					load(),
					import('$lib/utils/swap-tokens-filter.utils')
				]);

				const sources = await entry.getSupportedTokens?.();

				expect(
					sources?.has(
						nativeSwapTokenIdentifier({ networkId: solToken.network.id, symbol: solToken.symbol })
					)
				).toBeTruthy();
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

			it('should offer every Solana destination for a Solana source', async () => {
				const { entry, solToken } = await load();

				expect(
					entry.getSupportedDestinations({
						sourceToken: solToken,
						supportedSourceTokens: new Set(),
						findProviderSourceTokens: () => undefined
					})
				).toStrictEqual({ sol: 'any' });
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

				describe('as sources', () => {
					// The SPL tokens known when the lists load, a devnet one among them as with testnets on.
					beforeEach(() => {
						vi.doMock('$sol/derived/spl.derived', async (importOriginal) => {
							const [original, { USDC_TOKEN, DEVNET_USDC_TOKEN }] = await Promise.all([
								importOriginal<typeof splDerived>(),
								import('$env/tokens/tokens-spl/tokens.usdc.env')
							]);

							return {
								...original,
								splTokens: readable(
									[USDC_TOKEN, DEVNET_USDC_TOKEN].map((token) => ({ ...token, enabled: true }))
								)
							};
						});
					});

					afterEach(() => {
						vi.doUnmock('$sol/derived/spl.derived');
					});

					it('should offer the Solana mainnet tokens, and neither a devnet nor a local one', async () => {
						const [
							{ loadSwapSupportedTokens },
							{ swapSupportedTokensStore },
							{ filterSwapTokens },
							{ SOLANA_TOKEN, SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN },
							{ USDC_TOKEN, DEVNET_USDC_TOKEN }
						] = await Promise.all([
							import('$lib/services/swap-supported-tokens.services'),
							import('$lib/stores/swap-supported-tokens.store'),
							import('$lib/utils/swap-tokens-filter.utils'),
							import('$env/tokens/tokens.sol.env'),
							import('$env/tokens/tokens-spl/tokens.usdc.env')
						]);

						await loadSwapSupportedTokens({ identity: mockIdentity });

						const supported = get(swapSupportedTokensStore);

						assertNonNullish(supported);

						const sources = filterSwapTokens({
							tokens: [
								SOLANA_TOKEN,
								USDC_TOKEN,
								SOLANA_DEVNET_TOKEN,
								SOLANA_LOCAL_TOKEN,
								DEVNET_USDC_TOKEN
							].map((token) => ({ ...token, enabled: true })),
							supportedData: supported.aggregated
						});

						expect(sources.map(({ id }) => id)).toStrictEqual([SOLANA_TOKEN.id, USDC_TOKEN.id]);
					});
				});
			});
		});
	});
});
