import type * as TokensErc20Env from '$env/tokens/tokens.erc20.env';
import { ERC20_SUGGESTED_TOKENS } from '$env/tokens/tokens.erc20.env';
import type { InfuraErc20Provider } from '$eth/providers/infura-erc20.providers';
import { get } from 'svelte/store';

/**
 * A metadata-only ERC20 token must be kept out of the visible default-tokens
 * store (so new users don't see it), while `ERC20_SUGGESTED_TOKENS` must never
 * contain a metadata-only token. The token stays in `ALL_DEFAULT_ERC20_TOKENS`
 * (the enrichment `.find` is unchanged), so a manual import still resolves it.
 */
vi.mock('$eth/providers/infura-erc20.providers', () => ({
	InfuraErc20Provider: vi.fn(class {}),
	infuraErc20Providers: vi.fn()
}));

vi.mock('$env/tokens/tokens.erc20.env', async (importOriginal) => {
	const actual = await importOriginal<typeof TokensErc20Env>();
	const { ETHEREUM_NETWORK } = await import('$env/networks/networks.eth.env');
	const { TokenCategoryTagValue, TokenTagType } = await import('$lib/enums/token-tag');
	const { parseTokenId } = await import('$lib/validation/token.validation');

	const metadataOnlyToken = {
		id: parseTokenId('METAONLY'),
		network: ETHEREUM_NETWORK,
		standard: { code: 'erc20' as const },
		category: 'default' as const,
		tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
		name: 'Metadata Only',
		symbol: 'METAONLY',
		decimals: 8,
		address: '0x000000000000000000000000000000000000dEaD',
		metadataOnly: true
	};

	return {
		...actual,
		ADDITIONAL_ERC20_TOKENS: [...actual.ADDITIONAL_ERC20_TOKENS, metadataOnlyToken]
	};
});

describe('erc20.services - metadataOnly', () => {
	it('excludes metadata-only tokens from the visible default-tokens store', async () => {
		vi.resetModules();

		// Configure the fresh (post-reset) infura mock the re-imported service will use.
		const infuraProviders = await import('$eth/providers/infura-erc20.providers');
		vi.mocked(infuraProviders.infuraErc20Providers).mockReturnValue({
			metadata: vi.fn().mockResolvedValue({ name: 'Weenus', symbol: 'WEENUS', decimals: 18 })
		} as unknown as InfuraErc20Provider);

		const { loadDefaultErc20Tokens } = await import('$eth/services/erc20.services');
		const { erc20DefaultTokensStore } = await import('$eth/stores/erc20-default-tokens.store');
		erc20DefaultTokensStore.reset();

		await loadDefaultErc20Tokens();

		const tokens = get(erc20DefaultTokensStore) ?? [];

		expect(tokens.some(({ symbol }) => symbol === 'METAONLY')).toBeFalsy();
		// sanity: the store is populated with the non-metadata-only defaults
		expect(tokens.length).toBeGreaterThan(0);
	});
});

describe('ERC20_SUGGESTED_TOKENS invariant', () => {
	it('never contains a metadata-only token', () => {
		expect(ERC20_SUGGESTED_TOKENS.every(({ metadataOnly }) => !metadataOnly)).toBeTruthy();
	});
});
