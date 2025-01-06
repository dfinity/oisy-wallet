import Menu from '$lib/components/core/Menu.svelte';
import {
	NAVIGATION_MENU_BUTTON,
	NAVIGATION_MENU_VIP_BUTTON
} from '$lib/constants/test-ids.constants';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach } from 'node:test';
import type { UserData } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import { readable } from 'svelte/store';
import type { Identity } from '@dfinity/agent';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as authStore from '$lib/derived/auth.derived';

describe('Menu', () => {
	const menuButtonSelector = `button[data-tid="${NAVIGATION_MENU_BUTTON}"]`;
	const menuItemVipButtonSelector = `button[data-tid="${NAVIGATION_MENU_VIP_BUTTON}"]`;

	beforeEach(() => {
		userProfileStore.reset();
	});

	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

	it('renders the vip menu item', async () => {
		const mockedUserData: UserData = {
			is_vip: [true],
			airdrops: [],
			sprinkles: []
		};
		const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);
		mockAuthStore();

		const { container } = render(Menu);
		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);

		expect(menuButton).toBeInTheDocument();

		menuButton?.click();

		await waitFor(() => {
			const menuItemVipButton: HTMLButtonElement | null =
				container.querySelector(menuItemVipButtonSelector);
			if (menuItemVipButton == null) {
				throw new Error('menu item not yet loaded');
			}

			expect(menuItemVipButton).toBeInTheDocument();
		});
	});

	it('does not render the vip menu item', async () => {
		const mockedUserData: UserData = {
			is_vip: [false],
			airdrops: [],
			sprinkles: []
		};
		const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);
		mockAuthStore();

		const { container } = render(Menu);
		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);

		expect(menuButton).toBeInTheDocument();

		menuButton?.click();

		await waitFor(() => {
			const menuItemVipButton: HTMLButtonElement | null =
				container.querySelector(menuItemVipButtonSelector);
			if (menuItemVipButton == null) {
				expect(menuItemVipButton).toBeNull();
			} else {
				throw new Error('menu item loaded');
			}
		});
	});
});
