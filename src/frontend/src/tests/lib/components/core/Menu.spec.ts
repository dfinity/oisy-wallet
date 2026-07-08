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
	NAVIGATION_MENU_VIP_BUTTON,
	NAVIGATION_MENU_WHY_OISY_BUTTON
} from '$lib/constants/test-ids.constants';
import { modalStore } from '$lib/stores/modal.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { userSelectedNetworkStore } from '$lib/stores/user-selected-network.store';
import { getSymbol } from '$lib/utils/modal.utils';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { mockAuthSignedIn, mockAuthStore } from '$tests/mocks/auth.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mockGoto(...args)
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

		button.click();

		expect(mockGoto).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining(`/settings/?network=${ICP_NETWORK_ID.description}`)
		);
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
});
