import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import {
	TOKEN_MENU_BTC_BUTTON,
	TOKEN_MENU_ETH_BUTTON,
	TOKEN_MENU_IC_BUTTON,
	TOKEN_MENU_SOL_BUTTON
} from '$lib/constants/test-ids.constants';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { render } from '@testing-library/svelte';

describe('ContextMenu', () => {
	const icTokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_IC_BUTTON}"]`;
	const ethTokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_ETH_BUTTON}"]`;
	const btcTokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_BTC_BUTTON}"]`;
	const solTokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_SOL_BUTTON}"]`;

	beforeAll(() => {
		setupTestnetsStore('enabled');
	});

	beforeEach(() => {
		mockPage.reset();
	});

	it('renders the ic token menu', () => {
		mockPage.mock({ network: ICP_NETWORK.id.description });

		const { container } = render(ContextMenu);

		const button: HTMLButtonElement | null = container.querySelector(icTokenMenuButtonSelector);

		expect(button).toBeInTheDocument();
	});

	it('renders the eth token menu', () => {
		mockPage.mock({ network: DEFAULT_ETHEREUM_NETWORK.id.description });

		const { container } = render(ContextMenu);

		const button: HTMLButtonElement | null = container.querySelector(ethTokenMenuButtonSelector);

		expect(button).toBeInTheDocument();
	});

	it('renders the btc token menu', () => {
		mockPage.mock({ network: BTC_MAINNET_NETWORK.id.description });

		const { container } = render(ContextMenu);

		const button: HTMLButtonElement | null = container.querySelector(btcTokenMenuButtonSelector);

		expect(button).toBeInTheDocument();
	});

	it('renders the sol token menu', () => {
		mockPage.mock({ network: SOLANA_MAINNET_NETWORK.id.description });

		const { container } = render(ContextMenu);

		const button: HTMLButtonElement | null = container.querySelector(solTokenMenuButtonSelector);

		expect(button).toBeInTheDocument();
	});
});
