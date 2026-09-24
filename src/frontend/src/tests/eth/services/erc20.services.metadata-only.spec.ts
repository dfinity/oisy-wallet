import type { CustomToken } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type * as TokensErc20Env from '$env/tokens/tokens.erc20.env';
import { ERC20_SUGGESTED_TOKENS } from '$env/tokens/tokens.erc20.env';
import type { InfuraErc20Provider } from '$eth/providers/infura-erc20.providers';
import * as infuraProvidersModule from '$eth/providers/infura-erc20.providers';
import { loadCustomTokens, loadDefaultErc20Tokens } from '$eth/services/erc20.services';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { listCustomTokens } from '$lib/api/backend.api';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

const METADATA_ONLY_ADDRESS = '0x000000000000000000000000000000000000dEaD';

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

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

// The hoisted mock injects the metadata-only token into the curated defaults before
// `erc20.services` evaluates `ALL_DEFAULT_ERC20_TOKENS`, so the service under test can
// be imported statically: re-importing it after `vi.resetModules()` re-transformed its
// whole graph inside the test body and timed out under a parallel suite run.
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
	beforeEach(() => {
		vi.clearAllMocks();

		erc20DefaultTokensStore.reset();
		erc20CustomTokensStore.resetAll();
	});

	it('excludes metadata-only tokens from the visible default-tokens store', async () => {
		vi.mocked(infuraProvidersModule.infuraErc20Providers).mockReturnValue({
			metadata: vi.fn().mockResolvedValue({ name: 'Weenus', symbol: 'WEENUS', decimals: 18 })
		} as unknown as InfuraErc20Provider);

		await loadDefaultErc20Tokens();

		const tokens = get(erc20DefaultTokensStore) ?? [];

		expect(tokens.some(({ symbol }) => symbol === 'METAONLY')).toBeFalsy();
		// sanity: the store is populated with the non-metadata-only defaults
		expect(tokens.length).toBeGreaterThan(0);
	});

	it('still enriches a manually imported custom token at the metadata-only address', async () => {
		const metadataMock = vi.fn().mockResolvedValue({ name: 'X', symbol: 'X', decimals: 18 });
		vi.mocked(infuraProvidersModule.infuraErc20Providers).mockReturnValue({
			metadata: metadataMock
		} as unknown as InfuraErc20Provider);

		const customToken: CustomToken = {
			token: {
				Erc20: {
					chain_id: ETHEREUM_NETWORK.chainId,
					token_address: METADATA_ONLY_ADDRESS
				}
			},
			enabled: true,
			version: toNullable(),
			section: toNullable(),
			allow_external_content_source: toNullable(),
			allowed_external_content_source_urls: toNullable()
		};
		vi.mocked(listCustomTokens).mockResolvedValue([customToken]);

		mockAuthStore();

		await loadCustomTokens({ identity: mockIdentity });

		const customTokens = get(erc20CustomTokensStore) ?? [];

		// The metadata-only token is resolved from the curated defaults (its symbol),
		// and Infura is not queried for its address.
		expect(customTokens.some(({ data }) => data.symbol === 'METAONLY')).toBeTruthy();
		expect(metadataMock).not.toHaveBeenCalledWith({ address: METADATA_ONLY_ADDRESS });
	});
});

describe('ERC20_SUGGESTED_TOKENS invariant', () => {
	it('never contains a metadata-only token', () => {
		expect(ERC20_SUGGESTED_TOKENS.every(({ metadataOnly }) => !metadataOnly)).toBeTruthy();
	});
});
