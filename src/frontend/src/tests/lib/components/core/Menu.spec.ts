import { render, waitFor } from '@testing-library/svelte';
import Menu from '$lib/components/core/Menu.svelte';
import type { Settings, UserProfile } from '$declarations/backend/backend.did';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { beforeEach } from 'node:test';
import { NAVIGATION_MENU_BUTTON, NAVIGATION_MENU_VIP_BUTTON } from '$lib/constants/test-ids.constants';

describe('Menu', () => {
	const menuButtonSelector = `button[data-tid="${NAVIGATION_MENU_BUTTON}"]`;
	const menuItemVipButtonSelector = `button[data-tid="${NAVIGATION_MENU_VIP_BUTTON}"]`;

	beforeEach(() => {
		userProfileStore.reset();
	});

	it('renders the vip menu item', async () => {
		const settings: Settings = {
			...mockUserSettings,
			vip: {
				isVip: true
			}
		};

		const userProfile: UserProfile = {
			...mockUserProfile,
			settings: toNullable(settings)
		};

		userProfileStore.set({ profile: userProfile, certified: false });

		const { container } = render(Menu);
		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);

		expect(menuButton).toBeInTheDocument();

		menuButton?.click();

		await waitFor(() => {
			const menuItemVipButton: HTMLButtonElement | null = container.querySelector(menuItemVipButtonSelector);
			if (menuItemVipButton == null) {
				throw new Error('menu item not yet loaded');
			}

			expect(menuItemVipButton).toBeInTheDocument();
		});
	});

	it('does not render the vip menu item', async () => {
		const settings: Settings = {
			...mockUserSettings,
			vip: {
				isVip: false
			}
		};

		const userProfile: UserProfile = {
			...mockUserProfile,
			settings: toNullable(settings)
		};

		userProfileStore.set({ profile: userProfile, certified: false });

		const { container } = render(Menu);
		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);

		expect(menuButton).toBeInTheDocument();

		menuButton?.click();

		await waitFor(() => {
			const menuItemVipButton: HTMLButtonElement | null = container.querySelector(menuItemVipButtonSelector);
			if (menuItemVipButton == null) {
				expect(menuItemVipButton).toBeNull();
			} else {
				throw new Error('menu item loaded');
			}
		});
	});
});