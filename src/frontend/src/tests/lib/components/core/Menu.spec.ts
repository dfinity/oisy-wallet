import type { UserData } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import Menu from '$lib/components/core/Menu.svelte';
import {
	AUTH_LICENSE_LINK,
	LOGIN_BUTTON,
	NAVIGATION_MENU_ADDRESS_BOOK_BUTTON,
	NAVIGATION_MENU_BUTTON,
	NAVIGATION_MENU_DOC_BUTTON,
	NAVIGATION_MENU_GOLD_BUTTON,
	NAVIGATION_MENU_PRIVACY_MODE_BUTTON,
	NAVIGATION_MENU_REFERRAL_BUTTON,
	NAVIGATION_MENU_SUPPORT_BUTTON,
	NAVIGATION_MENU_VIP_BUTTON,
	NAVIGATION_MENU_WHY_OISY_BUTTON
} from '$lib/constants/test-ids.constants';
import * as toastsStore from '$lib/stores/toasts.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { mockAuthSignedIn, mockAuthStore } from '$tests/mocks/auth.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('Menu', () => {
	const menuButtonSelector = `button[data-tid="${NAVIGATION_MENU_BUTTON}"]`;
	const menuItemPrivacyModeButtonSelector = `button[data-tid="${NAVIGATION_MENU_PRIVACY_MODE_BUTTON}"]`;
	const menuItemVipButtonSelector = `button[data-tid="${NAVIGATION_MENU_VIP_BUTTON}"]`;
	const menuItemGoldButtonSelector = `button[data-tid="${NAVIGATION_MENU_GOLD_BUTTON}"]`;
	const menuItemAddressBookSelector = `button[data-tid="${NAVIGATION_MENU_ADDRESS_BOOK_BUTTON}"]`;
	const menuItemReferralButtonSelector = `button[data-tid="${NAVIGATION_MENU_REFERRAL_BUTTON}"]`;
	const menuItemWhyOisyButtonSelector = `button[data-tid="${NAVIGATION_MENU_WHY_OISY_BUTTON}"]`;
	const menuItemDocButtonSelector = `a[data-tid="${NAVIGATION_MENU_DOC_BUTTON}"]`;
	const menuItemSupportButtonSelector = `a[data-tid="${NAVIGATION_MENU_SUPPORT_BUTTON}"]`;
	const loginOrCreateButton = `button[data-tid="${LOGIN_BUTTON}"]`;
	const authLicenseLink = `a[data-tid="${AUTH_LICENSE_LINK}"]`;

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

	it('renders the address book button in the menu', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemAddressBookSelector });
	});

	it('always renders the referral button', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemReferralButtonSelector });
	});

	it('should render the logged out version if not signed in', async () => {
		mockAuthSignedIn(false);

		await openMenu();
		await waitForElement({ selector: menuItemDocButtonSelector });
		await waitForElement({ selector: menuItemWhyOisyButtonSelector });
		await waitForElement({ selector: menuItemSupportButtonSelector });
		await waitForElement({ selector: loginOrCreateButton });
		await waitForElement({ selector: authLicenseLink });
	});
});
