import type * as lifiEnv from '$env/rest/lifi.env';
import { evmSwapProviders } from '$lib/providers/evm-swap.providers';
import { SwapProvider } from '$lib/types/swap';
import { assertNonNullish } from '@dfinity/utils';

describe('evm-swap.providers', () => {
	describe('LI.FI entry', () => {
		it('should be registered by default', () => {
			expect(evmSwapProviders.find(({ key }) => key === SwapProvider.LIFI)).toBeDefined();
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
				const { evmSwapProviders: providers } = await import('$lib/providers/evm-swap.providers');

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

			// Network ids are symbols, so the token comes from the same module graph as the registry.
			const load = async () => {
				const [{ evmSwapProviders: providers }, { fetchLifiSwapQuote }, { BASE_ETH_TOKEN }] =
					await Promise.all([
						import('$lib/providers/evm-swap.providers'),
						import('$lib/services/lifi-swap.services'),
						import('$env/tokens/tokens-evm/tokens-base/tokens.eth.env')
					]);

				const entry = providers.find(({ key }) => key === SwapProvider.LIFI);

				assertNonNullish(entry);

				return { entry, fetchLifiSwapQuote, baseEthToken: BASE_ETH_TOKEN };
			};

			it('should register LI.FI as an enabled EVM provider without a source list', async () => {
				const { entry, fetchLifiSwapQuote } = await load();

				expect(entry.isEnabled).toBeTruthy();
				expect(entry.getQuote).toBe(fetchLifiSwapQuote);
				// Like Velora: a wildcard for EVM sources.
				expect(entry.getSupportedTokens).toBeUndefined();
			});

			it('should offer every EVM destination for an EVM source', async () => {
				const { entry, baseEthToken } = await load();

				expect(
					entry.getSupportedDestinations({
						sourceToken: baseEthToken,
						supportedSourceTokens: undefined,
						findProviderSourceTokens: () => undefined
					})
				).toStrictEqual({ evm: 'any' });
			});
		});
	});
});
