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
	NAVIGATION_ITEM_TOKENS,
	NAVIGATION_ITEM_TRADE,
	NAVIGATION_MORE_MENU_BUTTON
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
			// It is pinned to the bottom of the sidebar, in its own block. Asserted
			// rather than merely dropped from the list above, because a stray entry in
			// a desktop section would put it in both places at once.
			const { queryByTestId } = render(NavigationMainMenuItems);

			expect(queryByTestId(NAVIGATION_ITEM_SETTINGS)).toBeNull();
		});

		it('stacks Settings above the More menu in the bottom layout', () => {
			const { getByTestId } = render(NavigationMainMenuItems, { props: { layout: 'bottom' } });

			const settings = getByTestId(NAVIGATION_ITEM_SETTINGS);
			const more = getByTestId(NAVIGATION_MORE_MENU_BUTTON);

			// DOM order is visual order in a flex column with no `order` utilities.
			expect(
				settings.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
		});

		it('renders nothing but the pinned items in that layout', () => {
			// The pinned block keeps its height while the sections above scroll, so
			// it takes the named list and not whatever else the descriptors hold.
			const { queryByTestId } = render(NavigationMainMenuItems, { props: { layout: 'bottom' } });

			expect(queryByTestId(NAVIGATION_ITEM_TOKENS)).toBeNull();
			expect(queryByTestId(NAVIGATION_ITEM_REWARDS)).toBeNull();
		});

		it('leaves the sidebar More group as notes, explore and rewards', () => {
			// The social links went into the pinned More menu, not here: the first
			// version of this change put them in this group, which would have listed
			// them twice once the menu existed.
			const { getByTestId, queryByTestId } = render(NavigationMainMenuItems);

			expect(getByTestId(NAVIGATION_ITEM_NOTES)).toBeInTheDocument();
			expect(getByTestId(NAVIGATION_ITEM_EXPLORER)).toBeInTheDocument();
			expect(getByTestId(NAVIGATION_ITEM_REWARDS)).toBeInTheDocument();
			expect(queryByTestId(NAVIGATION_MORE_MENU_BUTTON)).toBeNull();
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
