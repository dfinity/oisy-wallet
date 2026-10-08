import * as cyclesMintEnv from '$env/cycles-mint.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import Actions from '$lib/components/hero/Actions.svelte';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import {
	BUY_TOKENS_MODAL_OPEN_BUTTON,
	CYCLES_MINT_BUTTON,
	NFT_HERO_CHECK_NEW_BUTTON,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
	SEND_TOKENS_MODAL_OPEN_BUTTON,
	SWAP_TOKENS_MODAL_OPEN_BUTTON
} from '$lib/constants/test-ids.constants';
import * as balancesDerived from '$lib/derived/balances.derived';
import * as pageTokenDerived from '$lib/derived/page-token.derived';
import * as swapDerived from '$lib/derived/swap.derived';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { HERO_CONTEXT_KEY, initHeroContext } from '$lib/stores/hero.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

// XRP is force-disabled under TEST, so it is absent from the supported-network catalog
// that the selected network resolves against. Enable it so the XRP branch of the hero
// actions can be exercised.
vi.mock('$env/networks/networks.xrp.env', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('$env/networks/networks.xrp.env');

	return {
		...actual,
		XRP_MAINNET_ENABLED: true,
		SUPPORTED_XRP_NETWORKS: [actual.XRP_MAINNET_NETWORK],
		SUPPORTED_XRP_NETWORK_IDS: [actual.XRP_MAINNET_NETWORK_ID]
	};
});

describe('Actions', () => {
	const swapButtonSelector = `button[data-tid="${SWAP_TOKENS_MODAL_OPEN_BUTTON}"]`;
	const sendButtonSelector = `button[data-tid="${SEND_TOKENS_MODAL_OPEN_BUTTON}"]`;
	const buyButtonSelector = `button[data-tid="${BUY_TOKENS_MODAL_OPEN_BUTTON}"]`;
	const checkNewCollectionsButtonSelector = `button[data-tid="${NFT_HERO_CHECK_NEW_BUTTON}"]`;
	const receiveButtonSelector = `button[data-tid="${RECEIVE_TOKENS_MODAL_OPEN_BUTTON}"]`;

	const heroContext = new Map<symbol, unknown>([[HERO_CONTEXT_KEY, initHeroContext()]]);

	const renderActions = () => render(Actions, { context: heroContext });

	beforeEach(() => {
		vi.restoreAllMocks();
		mockPage.reset();

		vi.spyOn(balancesDerived, 'allBalancesZero', 'get').mockReturnValue(readable(false));

		modalStore.close();
		xrpAddressMainnetStore.reset();
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

	describe('receive button visibility', () => {
		it.each([ICP_TOKEN, ETHEREUM_TOKEN, BTC_MAINNET_TOKEN, SOLANA_TOKEN, XRP_TOKEN])(
			'should show the receive button on the transactions page of the $network.name network',
			(token) => {
				setTransactionsPage();
				mockPage.mockToken(token);

				const { container } = renderActions();

				expect(container.querySelector(receiveButtonSelector)).toBeInTheDocument();
			}
		);

		it('should show the receive button when all networks are selected', () => {
			setTokensPage();

			const { container } = renderActions();

			expect(container.querySelector(receiveButtonSelector)).toBeInTheDocument();
		});

		// The chain-fusion fallback renders a receive button with the same test id, so
		// asserting on the button alone would not prove that the XRP branch was taken.
		it('should open the XRP receive modal on the XRP network', async () => {
			setTransactionsPage();
			mockPage.mockToken(XRP_TOKEN);

			xrpAddressMainnetStore.set({ data: mockXrpAddress, certified: true });

			const hero = initHeroContext();
			// The hero buttons start disabled until the wallet has loaded.
			hero.inflowActionsDisabled.set(false);

			const { container } = render(Actions, {
				context: new Map<symbol, unknown>([[HERO_CONTEXT_KEY, hero]])
			});

			const button = container.querySelector<HTMLButtonElement>(receiveButtonSelector);

			assertNonNullish(button);

			button.click();

			await waitFor(() => {
				expect(get(modalStore)?.type).toBe('xrp-receive');
			});
		});
	});

	describe('check for new collectibles button visibility', () => {
		it('should show the button on NFTs page when all networks are selected', () => {
			setNftsPage();

			const { container } = renderActions();

			expect(container.querySelector(checkNewCollectionsButtonSelector)).toBeInTheDocument();
		});

		it('should show the button on NFTs page for the ICP network', () => {
			setNftsPage();
			mockPage.mockNetwork(ICP_TOKEN.network.id.description);

			const { container } = renderActions();

			expect(container.querySelector(checkNewCollectionsButtonSelector)).toBeInTheDocument();
		});

		it.each([ETHEREUM_TOKEN, BTC_MAINNET_TOKEN, SOLANA_TOKEN])(
			'should hide the button on NFTs page for the $network.name network',
			(token) => {
				setNftsPage();
				mockPage.mockNetwork(token.network.id.description);

				const { container } = renderActions();

				expect(container.querySelector(checkNewCollectionsButtonSelector)).not.toBeInTheDocument();
			}
		);

		it('should hide the button on tokens page', () => {
			setTokensPage();

			const { container } = renderActions();

			expect(container.querySelector(checkNewCollectionsButtonSelector)).not.toBeInTheDocument();
		});

		it('should hide the button on transactions page', () => {
			setTransactionsPage();
			mockPage.mockToken(ICP_TOKEN);

			const { container } = renderActions();

			expect(container.querySelector(checkNewCollectionsButtonSelector)).not.toBeInTheDocument();
		});
	});

	describe('cycles mint button visibility', () => {
		const cyclesMintButtonSelector = `button[data-tid="${CYCLES_MINT_BUTTON}"]`;

		const setTokenPage = (token: typeof mockTcyclesToken) => {
			setTransactionsPage();
			mockPage.mockToken(token);
			vi.spyOn(pageTokenDerived, 'pageToken', 'get').mockReturnValue(readable(token));
			vi.spyOn(swapDerived, 'isPageTokenSwappable', 'get').mockReturnValue(readable(true));
		};

		const enable = (enabled: boolean) =>
			vi.spyOn(cyclesMintEnv, 'CYCLES_MINT_ENABLED', 'get').mockReturnValue(enabled);

		it('should show Mint on the TCYCLES page as the fourth button, after Receive, Send and Swap', () => {
			enable(true);
			setTokenPage(mockTcyclesToken);

			const { container } = renderActions();

			const testIds = [...container.querySelectorAll('button[data-tid]')].map((button) =>
				button.getAttribute('data-tid')
			);

			expect(testIds.slice(0, 4)).toEqual([
				RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
				SEND_TOKENS_MODAL_OPEN_BUTTON,
				SWAP_TOKENS_MODAL_OPEN_BUTTON,
				CYCLES_MINT_BUTTON
			]);
		});

		it('should hide Mint on any other token page', () => {
			enable(true);
			setTokenPage(mockValidIcrcToken);

			const { container } = renderActions();

			expect(container.querySelector(cyclesMintButtonSelector)).not.toBeInTheDocument();
		});

		it('should hide Mint outside the token page', () => {
			enable(true);
			setTokensPage();
			vi.spyOn(pageTokenDerived, 'pageToken', 'get').mockReturnValue(readable(mockTcyclesToken));

			const { container } = renderActions();

			expect(container.querySelector(cyclesMintButtonSelector)).not.toBeInTheDocument();
		});

		it('should hide Mint while the rollout flag is off', () => {
			enable(false);
			setTokenPage(mockTcyclesToken);

			const { container } = renderActions();

			expect(container.querySelector(cyclesMintButtonSelector)).not.toBeInTheDocument();
		});
	});
});
