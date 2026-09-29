import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
import type { Network } from '$lib/types/network';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

// XRP is behind a build flag that is off under TEST, so the network list is stubbed to
// make it selectable.
vi.mock('$lib/derived/networks.derived', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('$lib/derived/networks.derived');
	const { BTC_MAINNET_NETWORK } = await import('$env/networks/networks.btc.env');
	const { ETHEREUM_NETWORK } = await import('$env/networks/networks.eth.env');
	const { ICP_NETWORK } = await import('$env/networks/networks.icp.env');
	const { XRP_MAINNET_NETWORK } = await import('$env/networks/networks.xrp.env');
	const { readable } = await import('svelte/store');

	const mockNetworks = [BTC_MAINNET_NETWORK, ETHEREUM_NETWORK, ICP_NETWORK, XRP_MAINNET_NETWORK];

	return {
		...actual,
		networks: readable(mockNetworks),
		networksMainnets: readable(mockNetworks)
	};
});

describe('AddTokenByNetwork', () => {
	const renderComponent = (network?: Network) =>
		render(AddTokenByNetwork, {
			props: {
				network,
				tokenData: {},
				onBack: vi.fn(),
				onNext: vi.fn()
			}
		});

	beforeEach(() => {
		mockPage.reset();
	});

	it('should say custom tokens are not supported yet when the XRP network is filtered', () => {
		mockPage.mock({ network: XRP_MAINNET_NETWORK.id.description });

		const { container } = renderComponent(XRP_MAINNET_NETWORK);

		expect(container).toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported);
	});

	it('should say custom tokens are not supported when the Bitcoin network is filtered', () => {
		mockPage.mock({ network: BTC_MAINNET_NETWORK.id.description });

		const { container } = renderComponent(BTC_MAINNET_NETWORK);

		expect(container).toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
	});

	it('should say custom tokens are not supported yet when XRP is picked with all networks shown', () => {
		const { container } = renderComponent(XRP_MAINNET_NETWORK);

		expect(container).toHaveTextContent(en.tokens.manage.text.network);
		expect(container).toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
	});

	it('should show no unsupported-network text when no network is picked', () => {
		const { container } = renderComponent();

		expect(container).toHaveTextContent(en.tokens.manage.placeholder.select_network);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
	});
});
