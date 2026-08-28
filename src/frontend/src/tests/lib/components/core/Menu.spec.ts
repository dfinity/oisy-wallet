import type { MyTip } from '$declarations/backend/backend.did';
import type { UserData } from '$declarations/rewards/rewards.did';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import * as rewardApi from '$lib/api/reward.api';
import Menu from '$lib/components/core/Menu.svelte';
import {
	LOGIN_BUTTON,
	NAVIGATION_MENU_ADDRESS_BOOK_BUTTON,
	NAVIGATION_MENU_BUTTON,
	NAVIGATION_MENU_DOC_BUTTON,
	NAVIGATION_MENU_GOLD_BUTTON,
	NAVIGATION_MENU_PAY_BUTTON,
	NAVIGATION_MENU_PRIVACY_MODE_BUTTON,
	NAVIGATION_MENU_RECEIVE_BUTTON,
	NAVIGATION_MENU_REFERRAL_BUTTON,
	NAVIGATION_MENU_SCANNER_BUTTON,
	NAVIGATION_MENU_SETTINGS_BUTTON,
	NAVIGATION_MENU_SUPPORT_BUTTON,
	NAVIGATION_MENU_TIP_BADGE,
	NAVIGATION_MENU_TIP_COUNT,
	NAVIGATION_MENU_VIP_BUTTON,
	NAVIGATION_MENU_WHY_OISY_BUTTON
} from '$lib/constants/test-ids.constants';
import { BACKDROP_FADE_OUT_DURATION } from '$lib/constants/transition.constants';
import { modalStore } from '$lib/stores/modal.store';
import { tipsStore } from '$lib/stores/tips.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { userSelectedNetworkStore } from '$lib/stores/user-selected-network.store';
import { getSymbol } from '$lib/utils/modal.utils';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { mockAuthSignedIn, mockAuthStore } from '$tests/mocks/auth.mock';
import { assertNonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mockGoto(...args)
}));

// The tips menu item is behind the rollout flag, which is still off on the branch
// that owns this badge. The badge logic is what is under test, not the flag.
vi.mock(import('$env/tips.env'), async (importOriginal) => ({
	...(await importOriginal()),
	TIPS_ENABLED: true
}));

describe('Menu', () => {
	const menuButtonSelector = `button[data-tid="${NAVIGATION_MENU_BUTTON}"]`;
	const menuItemReceiveButtonSelector = `button[data-tid="${NAVIGATION_MENU_RECEIVE_BUTTON}"]`;
	const menuItemPrivacyModeButtonSelector = `button[data-tid="${NAVIGATION_MENU_PRIVACY_MODE_BUTTON}"]`;
	const menuItemVipButtonSelector = `button[data-tid="${NAVIGATION_MENU_VIP_BUTTON}"]`;
	const menuItemGoldButtonSelector = `button[data-tid="${NAVIGATION_MENU_GOLD_BUTTON}"]`;
	const menuItemAddressBookSelector = `button[data-tid="${NAVIGATION_MENU_ADDRESS_BOOK_BUTTON}"]`;
	const menuItemScannerButtonSelector = `button[data-tid="${NAVIGATION_MENU_SCANNER_BUTTON}"]`;
	const menuItemPayButtonSelector = `button[data-tid="${NAVIGATION_MENU_PAY_BUTTON}"]`;
	const menuItemReferralButtonSelector = `button[data-tid="${NAVIGATION_MENU_REFERRAL_BUTTON}"]`;
	const menuItemSettingsButtonSelector = `button[data-tid="${NAVIGATION_MENU_SETTINGS_BUTTON}"]`;
	const menuItemWhyOisyButtonSelector = `button[data-tid="${NAVIGATION_MENU_WHY_OISY_BUTTON}"]`;
	const menuItemDocButtonSelector = `a[data-tid="${NAVIGATION_MENU_DOC_BUTTON}"]`;
	const menuItemSupportButtonSelector = `a[data-tid="${NAVIGATION_MENU_SUPPORT_BUTTON}"]`;
	const loginOrCreateButton = `button[data-tid="${LOGIN_BUTTON}"]`;

	let container: HTMLElement;

	vi.mock('$lib/utils/share.utils', () => ({
		copyText: vi.fn()
	}));

	beforeEach(() => {
		userProfileStore.reset();
		vi.resetAllMocks();
		mockAuthStore();
		mockAuthSignedIn(true);
		vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockUserData([]));
		vi.spyOn(toastsStore, 'toastsShow');
		setPrivacyMode({ enabled: false });
		userSelectedNetworkStore.set(undefined);
	});

	const mockUserData = (powers: Array<string>): UserData => ({
		is_vip: [],
		superpowers: [powers],
		airdrops: [],
		usage_awards: [],
		last_snapshot_timestamp: [BigInt(Date.now())],
		sprinkles: []
	});

	const openMenu = () => {
		({ container } = render(Menu));
		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);

		expect(menuButton).toBeInTheDocument();

		menuButton?.click();
	};

	const waitForElement = async ({
		selector,
		shouldExist = true
	}: {
		selector: string;
		shouldExist?: boolean;
	}) =>
		await waitFor(() => {
			const element = container.querySelector(selector);
			if (shouldExist) {
				if (element == null) {
					throw new Error(`Element with selector "${selector}" not yet loaded`);
				}

				expect(element).toBeInTheDocument();
			} else {
				expect(element).toBeNull();
			}
			return element;
		});

	it('keeps the menu button highlighted while the popover is open', async () => {
		({ container } = render(Menu));

		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);

		assertNonNullish(menuButton);

		expect(menuButton).not.toHaveClass('opened');
		expect(menuButton).toHaveAttribute('aria-expanded', 'false');

		menuButton.click();

		await waitFor(() => {
			expect(menuButton).toHaveClass('opened');
			expect(menuButton).toHaveAttribute('aria-expanded', 'true');
		});
	});

	it('renders the privacy mode menu item', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemPrivacyModeButtonSelector });
	});

	it('renders the vip menu item', async () => {
		vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockUserData(['vip']));

		await openMenu();
		await waitForElement({ selector: menuItemVipButtonSelector });
	});

	it('does not render the vip menu item', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemVipButtonSelector, shouldExist: false });
	});

	it('renders the gold menu item', async () => {
		vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockUserData(['gold']));

		await openMenu();
		await waitForElement({ selector: menuItemGoldButtonSelector });
	});

	it('does not render the gold menu item', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemGoldButtonSelector, shouldExist: false });
	});

	it('renders the scanner button in the menu', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemScannerButtonSelector });
	});

	it('renders the pay button in the menu', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemPayButtonSelector });
	});

	it('should open the universal scanner modal', async () => {
		const openUniversalScannerSpy = vi.spyOn(modalStore, 'openUniversalScanner');

		await openMenu();
		await waitForElement({ selector: menuItemScannerButtonSelector });

		const button: HTMLButtonElement | null = container.querySelector(menuItemScannerButtonSelector);

		assertNonNullish(button);

		button.click();

		expect(openUniversalScannerSpy).toHaveBeenCalledExactlyOnceWith({
			id: expect.any(Symbol)
		});
	});

	it('should open the pay dialog modal', async () => {
		const openPayDialogSpy = vi.spyOn(modalStore, 'openPayDialog');

		await openMenu();
		await waitForElement({ selector: menuItemPayButtonSelector });

		const button: HTMLButtonElement | null = container.querySelector(menuItemPayButtonSelector);

		assertNonNullish(button);

		button.click();

		expect(openPayDialogSpy).toHaveBeenCalledExactlyOnceWith(expect.any(Symbol));
	});

	it('renders the address book button in the menu', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemAddressBookSelector });
	});

	it('always renders the referral button', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemReferralButtonSelector });
	});

	it('renders the support button in the menu', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemSupportButtonSelector });
	});

	it('renders the settings button in the menu', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemSettingsButtonSelector });
	});

	it('navigates to the settings page preserving the selected network when the settings button is clicked', async () => {
		userSelectedNetworkStore.set(ICP_NETWORK_ID);

		await openMenu();
		await waitForElement({ selector: menuItemSettingsButtonSelector });

		const button: HTMLButtonElement | null = container.querySelector(
			menuItemSettingsButtonSelector
		);

		assertNonNullish(button);

		// Navigation is deferred until the popover backdrop has faded out. Drive that
		// deterministic delay with fake timers instead of blocking on a real timeout.
		vi.useFakeTimers();

		button.click();

		await vi.advanceTimersByTimeAsync(BACKDROP_FADE_OUT_DURATION);

		expect(mockGoto).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining(`/settings/?network=${ICP_NETWORK_ID.description}`)
		);

		vi.useRealTimers();
	});

	it('should render the logged out version if not signed in', async () => {
		mockAuthSignedIn(false);

		await openMenu();
		await waitForElement({ selector: menuItemDocButtonSelector });
		await waitForElement({ selector: menuItemWhyOisyButtonSelector });
		await waitForElement({ selector: menuItemSupportButtonSelector });
		await waitForElement({ selector: loginOrCreateButton });
	});

	it('should open the receive modal', async () => {
		const openReceiveSpy = vi.spyOn(modalStore, 'openReceive');

		await openMenu();
		await waitForElement({ selector: menuItemReceiveButtonSelector });

		const button: HTMLButtonElement | null = container.querySelector(menuItemReceiveButtonSelector);

		assertNonNullish(button);

		button.click();

		expect(openReceiveSpy).toHaveBeenCalledWith(getSymbol('menu-addresses'));
	});

	describe('the tip attention badge', () => {
		const tip = (status: MyTip['status']): MyTip => ({
			tip_id: 'a-tip',
			ledger_canister_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
			amount: 500_000n,
			expires_at_ns: 1_800_000_000_000_000_000n,
			created_at_ns: 1_700_000_000_000_000_000n,
			status,
			message: [],
			claimed_by: [],
			last_claim_failure: []
		});

		beforeEach(() => {
			tipsStore.reset();
		});

		it('stays away when nothing needs attention', () => {
			// It has to mean something when it appears. A dot that is always there is
			// wallpaper. The shared blob keeps its element mounted and fades it, so
			// "away" is the transparent state rather than an absent node.
			tipsStore.set([tip({ Reserved: null }), tip({ Claimed: null })]);

			const { queryByTestId } = render(Menu);

			expect(queryByTestId(NAVIGATION_MENU_TIP_BADGE)).toHaveClass('opacity-0');
		});

		it('marks the menu icon when a tip could not be paid', () => {
			// The only signal outside the menu that something is wrong, which is what
			// makes opening the menu worth doing.
			tipsStore.set([tip({ Failed: null })]);

			const { queryByTestId } = render(Menu);

			expect(queryByTestId(NAVIGATION_MENU_TIP_BADGE)).toHaveClass('opacity-100');
		});

		it('says how many once the menu is open', async () => {
			// The dot says "something"; the count says how much, where there is room
			// for it and a screen reader will read it.
			tipsStore.set([tip({ Failed: null })]);

			const { container, queryByTestId } = render(Menu);

			container.querySelector<HTMLButtonElement>(menuButtonSelector)?.click();

			await waitFor(() => expect(queryByTestId(NAVIGATION_MENU_TIP_COUNT)).toBeInTheDocument());
		});
	});
});
