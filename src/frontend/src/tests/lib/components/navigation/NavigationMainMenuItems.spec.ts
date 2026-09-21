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
	NAVIGATION_ITEM_GITHUB,
	NAVIGATION_ITEM_NFTS,
	NAVIGATION_ITEM_NOTES,
	NAVIGATION_ITEM_REWARDS,
	NAVIGATION_ITEM_SETTINGS,
	NAVIGATION_ITEM_TOKENS,
	NAVIGATION_ITEM_TRADE,
	NAVIGATION_ITEM_X
} from '$lib/constants/test-ids.constants';
import * as networkDerived from '$lib/derived/network.derived';
import { TokenTypes } from '$lib/enums/token-types';
import { activeAssetsTabStore } from '$lib/stores/settings.store';
import { bottomSheetOpenStore } from '$lib/stores/ui.store';
import { userSelectedNetworkStore } from '$lib/stores/user-selected-network.store';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

const navigationMocks = vi.hoisted(() => ({
	beforeNavigateCallback: undefined as undefined | (() => void),
	afterNavigateCallback: undefined as undefined | ((navigation: { from: null }) => void)
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	beforeNavigate: (callback: () => void) => {
		navigationMocks.beforeNavigateCallback = callback;
	},
	afterNavigate: (callback: (navigation: { from: null }) => void) => {
		navigationMocks.afterNavigateCallback = callback;
	}
}));

vi.spyOn(networkDerived, 'networkId', 'get').mockReturnValue(readable(ETHEREUM_NETWORK_ID));

describe('NavigationMainMenuItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		activeAssetsTabStore.reset({ key: 'active-assets-tab' });
		userSelectedNetworkStore.set(undefined);
		bottomSheetOpenStore.set(false);
	});

	it('renders all basic navigation items', () => {
		activeAssetsTabStore.set({ key: 'active-assets-tab', value: TokenTypes.TOKENS });

		const { getByTestId } = render(NavigationMainMenuItems);

		expect(getByTestId(NAVIGATION_ITEM_TOKENS)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_NFTS)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_ACTIVITY)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_TRADE)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_EXPLORER)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_REWARDS)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_NOTES)).toBeInTheDocument();
		// Earn (EARNING_ENABLED) is feature-flagged off in tests, so it is not
		// asserted here.
		//
		// Settings is not here either: it renders in the page footer now, which is
		// the `footer` layout below.
	});

	describe('the utility items', () => {
		it('keeps Settings out of the sidebar', () => {
			// It moved to the footer's left cluster. Asserted rather than merely
			// dropped from the list above, because a stray descriptor left in a
			// desktop section would put it in both places at once.
			const { queryByTestId } = render(NavigationMainMenuItems);

			expect(queryByTestId(NAVIGATION_ITEM_SETTINGS)).toBeNull();
		});

		it('renders Settings in the footer layout', () => {
			const { getByTestId } = render(NavigationMainMenuItems, { props: { layout: 'footer' } });

			expect(getByTestId(NAVIGATION_ITEM_SETTINGS)).toBeInTheDocument();
		});

		it('renders nothing but the footer items in that layout', () => {
			// The footer cluster is a narrow strip beside the DFINITY credit, so it
			// takes the named list and not whatever else the descriptors hold.
			const { queryByTestId } = render(NavigationMainMenuItems, { props: { layout: 'footer' } });

			expect(queryByTestId(NAVIGATION_ITEM_TOKENS)).toBeNull();
			expect(queryByTestId(NAVIGATION_ITEM_X)).toBeNull();
		});

		it('puts the social links in the sidebar, where the utility items were', () => {
			const { getByTestId } = render(NavigationMainMenuItems);

			expect(getByTestId(NAVIGATION_ITEM_X)).toBeInTheDocument();
			expect(getByTestId(NAVIGATION_ITEM_GITHUB)).toBeInTheDocument();
		});

		it('opens the social links in a new tab, with noopener', () => {
			// They were `ExternalLinkIcon`s in the footer, which sets both. A plain
			// `NavigationItem` would have taken the whole app to x.com in the same
			// tab and handed the opened page a `window.opener` handle.
			const { getByTestId } = render(NavigationMainMenuItems);

			for (const testId of [NAVIGATION_ITEM_X, NAVIGATION_ITEM_GITHUB]) {
				const link = getByTestId(testId);

				expect(link.getAttribute('target')).toBe('_blank');
				expect(link.getAttribute('rel')).toContain('noopener');
			}
		});

		it('leaves in-app items routing in the same tab', () => {
			const { getByTestId } = render(NavigationMainMenuItems);

			expect(getByTestId(NAVIGATION_ITEM_REWARDS).getAttribute('target')).toBeNull();
		});
	});

	it('renders the desktop section headings', () => {
		const { getByTestId } = render(NavigationMainMenuItems);

		expect(getByTestId(NAVIGATION_GROUP_PORTFOLIO)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_GROUP_FINANCE)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_GROUP_MORE)).toBeInTheDocument();
	});

	it('renders the Finance cradle and More group buttons on the mobile layout', () => {
		const { getByTestId, queryByTestId } = render(NavigationMainMenuItems, {
			props: { layout: 'mobile' }
		});

		expect(getByTestId(NAVIGATION_GROUP_FINANCE)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_GROUP_MORE)).toBeInTheDocument();
		// Portfolio is a desktop-only section, not a mobile bar slot.
		expect(queryByTestId(NAVIGATION_GROUP_PORTFOLIO)).toBeNull();
	});

	it('opens the Finance sheet on cradle click without hiding the bar', async () => {
		const { getByTestId, queryByTestId } = render(NavigationMainMenuItems, {
			props: { layout: 'mobile' }
		});

		// Sheet closed: a Finance child (Borrow) is not in the bar.
		expect(queryByTestId(NAVIGATION_ITEM_BORROW)).toBeNull();
		expect(get(bottomSheetOpenStore)).toBeFalsy();

		await fireEvent.click(getByTestId(NAVIGATION_GROUP_FINANCE));

		// The sheet now shows the Finance children, and the bar stays (store untouched).
		expect(getByTestId(NAVIGATION_ITEM_BORROW)).toBeInTheDocument();
		expect(get(bottomSheetOpenStore)).toBeFalsy();
	});

	it('closes the open group sheet when a navigation completes', async () => {
		const { getByTestId, queryByTestId } = render(NavigationMainMenuItems, {
			props: { layout: 'mobile' }
		});

		await fireEvent.click(getByTestId(NAVIGATION_GROUP_FINANCE));

		expect(getByTestId(NAVIGATION_ITEM_BORROW)).toBeInTheDocument();

		// Picking a sheet item starts a navigation: the sheet closes without its exit
		// animation so its scrim never lingers over the freshly-rendered page.
		navigationMocks.beforeNavigateCallback?.();
		navigationMocks.afterNavigateCallback?.({ from: null });

		await waitFor(() => expect(queryByTestId(NAVIGATION_ITEM_BORROW)).toBeNull());
	});

	it('surfaces Borrow in Finance linking to the Borrow page', () => {
		const { getByTestId } = render(NavigationMainMenuItems);

		const borrowLink = getByTestId(NAVIGATION_ITEM_BORROW);

		expect(borrowLink.getAttribute('href')).toContain(AppPath.Borrow);
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
