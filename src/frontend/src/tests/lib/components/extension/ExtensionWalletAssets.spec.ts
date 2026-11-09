import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import ExtensionWalletAssets from '$lib/components/extension/ExtensionWalletAssets.svelte';
import { OISY_EXTENSION_PANEL_ASSETS_LIMIT } from '$lib/constants/extension.constants';
import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { transactionsUrl } from '$lib/utils/nav.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

const mockStores = vi.hoisted(() => ({
	setSorted: (_v: unknown[]) => {}
}));

vi.mock('$lib/derived/network-tokens-ui.derived', async () => {
	const { writable } = await import('svelte/store');
	const sorted = writable<unknown[]>([]);
	mockStores.setSorted = (v) => sorted.set(v);
	return { sortedEnabledNetworkTokenUiOrGroupUi: sorted, enabledFungibleNetworkTokensUi: sorted };
});

vi.mock('$lib/services/extension-panel.services', () => ({
	saveExtensionPanelSnapshot: vi.fn()
}));

const tokenUi = ({
	token,
	usdBalance
}: {
	token: Omit<TokenUi, 'balance'>;
	usdBalance: number;
}): TokenUi => ({
	...token,
	balance: 1n,
	usdBalance
});

const eth = tokenUi({ token: ETHEREUM_TOKEN, usdBalance: 2000 });
const icp = tokenUi({ token: ICP_TOKEN, usdBalance: 500 });
const sol = tokenUi({ token: SOLANA_TOKEN, usdBalance: 100 });
const sepolia = tokenUi({ token: SEPOLIA_TOKEN, usdBalance: 0 });

const cardId = ({ symbol, network }: TokenUi) =>
	`${TOKEN_CARD}-${symbol}-${network.id.description}`;

describe('ExtensionWalletAssets', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPage.mockUrl(new URL('http://localhost:5175/extension/panel/'));
	});

	it("shows OISY's home list in its order, testnets included", async () => {
		mockStores.setSorted([{ token: eth }, { token: icp }, { token: sepolia }]);

		const { container } = render(ExtensionWalletAssets);

		await waitFor(() =>
			expect(
				[...container.querySelectorAll(`[data-tid^="${TOKEN_CARD}-"]`)].map((card) =>
					card.getAttribute('data-tid')
				)
			).toEqual([cardId(eth), cardId(icp), cardId(sepolia)])
		);
	});

	it(`shows only the first ${OISY_EXTENSION_PANEL_ASSETS_LIMIT} rows`, async () => {
		const many: TokenUiOrGroupUi[] = Array.from({ length: 7 }, (_, index) => ({
			token: {
				...tokenUi({ token: mockValidToken, usdBalance: 7 - index }),
				id: parseTokenId(`TOKEN${index}`),
				symbol: `TOKEN${index}`
			}
		}));
		mockStores.setSorted(many);

		const { container } = render(ExtensionWalletAssets);

		await waitFor(() =>
			expect(container.querySelectorAll(`[data-tid^="${TOKEN_CARD}-"]`)).toHaveLength(
				OISY_EXTENSION_PANEL_ASSETS_LIMIT
			)
		);
	});

	it("opens the token's page in OISY in a new tab", async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		mockStores.setSorted([{ token: sol }]);

		const { getByTestId } = render(ExtensionWalletAssets);

		await waitFor(() => expect(getByTestId(cardId(sol))).toBeInTheDocument());
		await fireEvent.click(getByTestId(cardId(sol)));

		expect(open).toHaveBeenCalledExactlyOnceWith(
			`http://localhost:5175${transactionsUrl({ token: sol })}`,
			'_blank',
			'noopener,noreferrer'
		);
	});

	it('links to all assets in OISY', () => {
		const { getByRole } = render(ExtensionWalletAssets);

		expect(getByRole('link', { name: en.extension.panel.all_tokens })).toHaveAttribute(
			'href',
			'http://localhost:5175/'
		);
	});
});
