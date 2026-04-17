import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import Actions from '$lib/components/hero/Actions.svelte';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import {
	BUY_TOKENS_MODAL_OPEN_BUTTON,
	SEND_TOKENS_MODAL_OPEN_BUTTON,
	SWAP_TOKENS_MODAL_OPEN_BUTTON
} from '$lib/constants/test-ids.constants';
import * as balancesDerived from '$lib/derived/balances.derived';
import * as swapDerived from '$lib/derived/swap.derived';
import { HERO_CONTEXT_KEY, initHeroContext } from '$lib/stores/hero.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('Actions', () => {
	const swapButtonSelector = `button[data-tid="${SWAP_TOKENS_MODAL_OPEN_BUTTON}"]`;
	const sendButtonSelector = `button[data-tid="${SEND_TOKENS_MODAL_OPEN_BUTTON}"]`;
	const buyButtonSelector = `button[data-tid="${BUY_TOKENS_MODAL_OPEN_BUTTON}"]`;

	const heroContext = new Map<symbol, unknown>([[HERO_CONTEXT_KEY, initHeroContext()]]);

	const renderActions = () => render(Actions, { context: heroContext });

	beforeEach(() => {
		vi.restoreAllMocks();
		mockPage.reset();

		vi.spyOn(balancesDerived, 'allBalancesZero', 'get').mockReturnValue(readable(false));
	});

	const setTokensPage = () => {
		mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Tokens}` });
	};

	const setTransactionsPage = () => {
		mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Transactions}` });
	};

	const setNftsPage = () => {
		mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Nfts}` });
	};

	describe('swap button visibility', () => {
		it('should show swap button on tokens page', () => {
			setTokensPage();
			mockPage.mockToken(ICP_TOKEN);

			const { container } = renderActions();

			expect(container.querySelector(swapButtonSelector)).toBeInTheDocument();
		});

		it('should show swap button on transactions page when token is swappable', () => {
			setTransactionsPage();
			mockPage.mockToken(ICP_TOKEN);
			vi.spyOn(swapDerived, 'isPageTokenSwappable', 'get').mockReturnValue(readable(true));

			const { container } = renderActions();

			expect(container.querySelector(swapButtonSelector)).toBeInTheDocument();
		});

		it('should hide swap button on transactions page when token is not swappable', () => {
			setTransactionsPage();
			mockPage.mockToken(BTC_MAINNET_TOKEN);
			vi.spyOn(swapDerived, 'isPageTokenSwappable', 'get').mockReturnValue(readable(false));

			const { container } = renderActions();

			expect(container.querySelector(swapButtonSelector)).not.toBeInTheDocument();
		});

		it('should show swap button on transactions page when no token is selected', () => {
			setTransactionsPage();
			mockPage.mockNetwork(ICP_TOKEN.network.id.description);

			const { container } = renderActions();

			expect(container.querySelector(swapButtonSelector)).toBeInTheDocument();
		});

		it('should hide swap button on NFTs page', () => {
			setNftsPage();
			mockPage.mockToken(ICP_TOKEN);

			const { container } = renderActions();

			expect(container.querySelector(swapButtonSelector)).not.toBeInTheDocument();
		});
	});

	describe('send button visibility', () => {
		it('should show send button on tokens page when balances are not all zero', () => {
			setTokensPage();
			mockPage.mockToken(ICP_TOKEN);
			vi.spyOn(balancesDerived, 'allBalancesZero', 'get').mockReturnValue(readable(false));

			const { container } = renderActions();

			expect(container.querySelector(sendButtonSelector)).toBeInTheDocument();
		});

		it('should hide send button on tokens page when all balances are zero', () => {
			setTokensPage();
			mockPage.mockToken(ICP_TOKEN);
			vi.spyOn(balancesDerived, 'allBalancesZero', 'get').mockReturnValue(readable(true));

			const { container } = renderActions();

			expect(container.querySelector(sendButtonSelector)).not.toBeInTheDocument();
		});

		it('should show send button on transactions page even when all balances are zero', () => {
			setTransactionsPage();
			mockPage.mockToken(ICP_TOKEN);
			vi.spyOn(balancesDerived, 'allBalancesZero', 'get').mockReturnValue(readable(true));

			const { container } = renderActions();

			expect(container.querySelector(sendButtonSelector)).toBeInTheDocument();
		});
	});

	describe('buy button visibility', () => {
		it('should show buy button on non-ICP network', () => {
			setTokensPage();
			mockPage.mockToken(ETHEREUM_TOKEN);

			const { container } = renderActions();

			expect(container.querySelector(buyButtonSelector)).toBeInTheDocument();
		});

		it('should show buy button on ICP network when token has buy property', () => {
			setTokensPage();
			mockPage.mockToken(ICP_TOKEN);

			const { container } = renderActions();

			expect(container.querySelector(buyButtonSelector)).toBeInTheDocument();
		});

		it('should show buy button on Solana network', () => {
			setTokensPage();
			mockPage.mockToken(SOLANA_TOKEN);

			const { container } = renderActions();

			expect(container.querySelector(buyButtonSelector)).toBeInTheDocument();
		});

		it('should hide buy button on NFTs page', () => {
			setNftsPage();
			mockPage.mockToken(ICP_TOKEN);

			const { container } = renderActions();

			expect(container.querySelector(buyButtonSelector)).not.toBeInTheDocument();
		});
	});
});
