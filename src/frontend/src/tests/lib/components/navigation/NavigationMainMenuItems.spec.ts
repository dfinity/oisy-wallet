import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import NavigationMainMenuItems from '$lib/components/navigation/NavigationMenuMainItems.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import {
	NAVIGATION_GROUP_FINANCE,
	NAVIGATION_GROUP_MORE,
	NAVIGATION_GROUP_PORTFOLIO,
	NAVIGATION_ITEM_ACTIVITY,
	NAVIGATION_ITEM_BORROW,
	NAVIGATION_ITEM_EXPLORER,
	NAVIGATION_ITEM_NFTS,
	NAVIGATION_ITEM_NOTES,
	NAVIGATION_ITEM_REWARDS,
	NAVIGATION_ITEM_SETTINGS,
	NAVIGATION_ITEM_TOKENS
} from '$lib/constants/test-ids.constants';
import * as networkDerived from '$lib/derived/network.derived';
import { TokenTypes } from '$lib/enums/token-types';
import { activeAssetsTabStore } from '$lib/stores/settings.store';
import { userSelectedNetworkStore } from '$lib/stores/user-selected-network.store';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.spyOn(networkDerived, 'networkId', 'get').mockReturnValue(readable(ETHEREUM_NETWORK_ID));

describe('NavigationMainMenuItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		activeAssetsTabStore.reset({ key: 'active-assets-tab' });
		userSelectedNetworkStore.set(undefined);
	});

	it('renders all basic navigation items', () => {
		activeAssetsTabStore.set({ key: 'active-assets-tab', value: TokenTypes.TOKENS });

		const { getByTestId } = render(NavigationMainMenuItems);

		expect(getByTestId(NAVIGATION_ITEM_TOKENS)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_NFTS)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_ACTIVITY)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_EXPLORER)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_NOTES)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_REWARDS)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_SETTINGS)).toBeInTheDocument();
	});

	it('renders the desktop section headings', () => {
		const { getByTestId } = render(NavigationMainMenuItems);

		expect(getByTestId(NAVIGATION_GROUP_PORTFOLIO)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_GROUP_FINANCE)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_GROUP_MORE)).toBeInTheDocument();
	});

	it('does not render section headings on the mobile layout', () => {
		const { queryByTestId } = render(NavigationMainMenuItems, { props: { layout: 'mobile' } });

		expect(queryByTestId(NAVIGATION_GROUP_PORTFOLIO)).toBeNull();
		expect(queryByTestId(NAVIGATION_GROUP_FINANCE)).toBeNull();
		expect(queryByTestId(NAVIGATION_GROUP_MORE)).toBeNull();
	});

	it('surfaces Borrow in Finance linking to the Liquidium provider page', () => {
		const { getByTestId } = render(NavigationMainMenuItems);

		const borrowLink = getByTestId(NAVIGATION_ITEM_BORROW);

		expect(borrowLink.getAttribute('href')).toContain(AppPath.ProvidersLiquidium);
	});

	it('surfaces NFTs as its own nav item linking to the NFTs page', () => {
		const { getByTestId } = render(NavigationMainMenuItems);

		const nftsLink = getByTestId(NAVIGATION_ITEM_NFTS);

		expect(nftsLink.getAttribute('href')).toContain(AppPath.Nfts);
	});

	it('keeps the assets link on the Tokens list when a stale NFTS tab is persisted', () => {
		activeAssetsTabStore.set({ key: 'active-assets-tab', value: TokenTypes.NFTS });

		const { getByTestId } = render(NavigationMainMenuItems);

		const tokenLink = getByTestId(NAVIGATION_ITEM_TOKENS);

		expect(tokenLink.getAttribute('href')).not.toContain(AppPath.Nfts);
		expect(tokenLink.getAttribute('href')).toContain(AppPath.Tokens);
	});

	it('builds assets link with Earning path when assetsTab = EARNING', () => {
		activeAssetsTabStore.set({ key: 'active-assets-tab', value: TokenTypes.EARNING });

		const { getByTestId } = render(NavigationMainMenuItems);

		const tokenLink = getByTestId(NAVIGATION_ITEM_TOKENS);

		expect(tokenLink.getAttribute('href')).toContain(AppPath.Earning);
	});

	it('builds assets link with Tokens path when assetsTab = TOKENS', () => {
		activeAssetsTabStore.set({ key: 'active-assets-tab', value: TokenTypes.TOKENS });

		const { getByTestId } = render(NavigationMainMenuItems);

		const tokenLink = getByTestId(NAVIGATION_ITEM_TOKENS);

		expect(tokenLink.getAttribute('href')).toContain(AppPath.Tokens);
	});

	it('should incorporate the network query param if userSelectedNetwork is set', () => {
		userSelectedNetworkStore.set(ETHEREUM_NETWORK_ID);

		const { getByTestId } = render(NavigationMainMenuItems);

		const tokenLink = getByTestId(NAVIGATION_ITEM_TOKENS);

		expect(tokenLink.getAttribute('href')).toContain(ETHEREUM_NETWORK_ID.description);
	});

	it('should not incorporate the network query param if userSelectedNetwork is not set', () => {
		const { getByTestId } = render(NavigationMainMenuItems);

		const tokenLink = getByTestId(NAVIGATION_ITEM_TOKENS);

		expect(tokenLink.getAttribute('href')).not.toContain(ETHEREUM_NETWORK_ID.description);
	});
});
