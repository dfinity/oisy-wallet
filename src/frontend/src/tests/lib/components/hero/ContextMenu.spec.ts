import { render } from '@testing-library/svelte';
import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
import { mockPage } from '$tests/mocks/page.store.mock';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import { BTC_MAINNET_NETWORK, ICP_NETWORK } from '$env/networks.env';

describe('ContextMenu', () => {
	const ethTokenMenuButtonSelector = 'button[data-tid="eth-token-menu"]';
	const btcTokenMenuButtonSelector = 'button[data-tid="btc-token-menu"]';
	const icTokenMenuButtonSelector = 'button[data-tid="ic-token-menu"]';

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