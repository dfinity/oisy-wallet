import type { UserData } from '$declarations/rewards/rewards.did';
import * as addressBookEnv from '$env/address-book.env';
import * as rewardApi from '$lib/api/reward.api';
import Menu from '$lib/components/core/Menu.svelte';
import {
	NAVIGATION_MENU_ADDRESS_BOOK_BUTTON,
	NAVIGATION_MENU_BUTTON,
	NAVIGATION_MENU_REFERRAL_BUTTON,
	NAVIGATION_MENU_VIP_BUTTON
} from '$lib/constants/test-ids.constants';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('Menu', () => {
	const menuButtonSelector = `button[data-tid="${NAVIGATION_MENU_BUTTON}"]`;
	const menuItemVipButtonSelector = `button[data-tid="${NAVIGATION_MENU_VIP_BUTTON}"]`;
	const menuItemAddressBookSelector = `button[data-tid="${NAVIGATION_MENU_ADDRESS_BOOK_BUTTON}"]`;
	const menuItemReferralButtonSelector = `button[data-tid="${NAVIGATION_MENU_REFERRAL_BUTTON}"]`;

	let container: HTMLElement;

	beforeEach(() => {
		userProfileStore.reset();
		vi.resetAllMocks();
		mockAuthStore();
		vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockUserData([]));
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
		container = render(Menu).container;
		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);

		expect(menuButton).toBeInTheDocument();

		menuButton?.click();
	};

	async function waitForElement({
		selector,
		shouldExist = true
	}: {
		selector: string;
		shouldExist?: boolean;
	}) {
		return await waitFor(() => {
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
	}

	it('renders the vip menu item', async () => {
		vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockUserData(['vip']));

		await openMenu();
		await waitForElement({ selector: menuItemVipButtonSelector });
	});

	it('does not render the vip menu item', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemVipButtonSelector, shouldExist: false });
	});

	it('renders the address book button when ADDRESS_BOOK_ENABLED is true', async () => {
		vi.spyOn(addressBookEnv, 'ADDRESS_BOOK_ENABLED', 'get').mockReturnValue(true);

		await openMenu();
		await waitForElement({ selector: menuItemAddressBookSelector });
	});

	it('does not render the address book button when ADDRESS_BOOK_ENABLED is false', async () => {
		vi.spyOn(addressBookEnv, 'ADDRESS_BOOK_ENABLED', 'get').mockReturnValue(false);

		await openMenu();
		await waitForElement({ selector: menuItemAddressBookSelector, shouldExist: false });
	});

	it('always renders the referral button', async () => {
		await openMenu();
		await waitForElement({ selector: menuItemReferralButtonSelector });
	});
});
