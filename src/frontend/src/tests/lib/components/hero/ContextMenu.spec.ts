import { BTC_MAINNET_NETWORK, ICP_NETWORK } from '$env/networks/networks.env';
import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import {
	TOKEN_MENU_BTC_BUTTON,
	TOKEN_MENU_ETH_BUTTON,
	TOKEN_MENU_IC_BUTTON
} from '$lib/constants/test-ids.constants';
import { testnetsStore } from '$lib/stores/settings.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

describe('ContextMenu', () => {
	const icTokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_IC_BUTTON}"]`;
	const ethTokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_ETH_BUTTON}"]`;
	const btcTokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_BTC_BUTTON}"]`;

	beforeAll(() => {
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });
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
});
