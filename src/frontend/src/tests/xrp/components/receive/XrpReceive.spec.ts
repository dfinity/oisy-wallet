import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import {
	RECEIVE_TOKENS_MODAL_ADDRESS_LABEL,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON
} from '$lib/constants/test-ids.constants';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { HERO_CONTEXT_KEY, initHeroContext } from '$lib/stores/hero.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import XrpReceive from '$xrp/components/receive/XrpReceive.svelte';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// XRP is force-disabled under TEST, so it is absent from the supported-network catalog
// that `networkId` - and therefore `networkAddressStore` - resolves against. Enable it
// for this spec so the component can find the XRP address.
vi.mock('$env/networks/networks.xrp.env', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('$env/networks/networks.xrp.env');

	return {
		...actual,
		XRP_MAINNET_ENABLED: true,
		SUPPORTED_XRP_NETWORKS: [actual.XRP_MAINNET_NETWORK],
		SUPPORTED_XRP_NETWORK_IDS: [actual.XRP_MAINNET_NETWORK_ID]
	};
});

describe('XrpReceive', () => {
	let heroContext: Map<symbol, unknown>;

	const renderComponent = () =>
		render(XrpReceive, { context: heroContext, props: { token: XRP_TOKEN } });

	beforeEach(() => {
		vi.clearAllMocks();

		const hero = initHeroContext();
		// The hero buttons start disabled until the wallet has loaded.
		hero.inflowActionsDisabled.set(false);
		heroContext = new Map<symbol, unknown>([[HERO_CONTEXT_KEY, hero]]);

		mockPage.reset();
		mockPage.mockNetwork(XRP_TOKEN.network.id.description);

		modalStore.close();
		xrpAddressMainnetStore.reset();
		xrpAddressMainnetStore.set({ data: mockXrpAddress, certified: true });
	});

	it('should render the receive button', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId(RECEIVE_TOKENS_MODAL_OPEN_BUTTON)).toBeInTheDocument();
	});

	it('should open the receive modal with the XRP address', async () => {
		const { getByTestId } = renderComponent();

		getByTestId(RECEIVE_TOKENS_MODAL_OPEN_BUTTON).click();

		await waitFor(() => {
			expect(get(modalStore)?.type).toBe('xrp-receive');
		});

		await waitFor(() => {
			expect(getByTestId(RECEIVE_TOKENS_MODAL_ADDRESS_LABEL)).toHaveTextContent(mockXrpAddress);
		});
	});

	it('should not open the modal while the address is not certified', async () => {
		vi.useFakeTimers();

		xrpAddressMainnetStore.reset();

		const { getByTestId } = renderComponent();

		getByTestId(RECEIVE_TOKENS_MODAL_OPEN_BUTTON).click();

		await vi.advanceTimersByTimeAsync(100);

		expect(get(modalStore)).toBeNull();

		vi.useRealTimers();
	});
});
