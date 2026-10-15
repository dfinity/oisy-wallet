import type * as lifiEnv from '$env/rest/lifi.env';
import { solSwapProviders } from '$lib/providers/sol-swap.providers';
import { SwapProvider } from '$lib/types/swap';
import { assertNonNullish } from '@dfinity/utils';

describe('sol-swap.providers', () => {
	describe('LI.FI entry', () => {
		it('should not be registered while the flag is off', () => {
			expect(solSwapProviders.find(({ key }) => key === SwapProvider.LIFI)).toBeUndefined();
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
		});
	});
});
