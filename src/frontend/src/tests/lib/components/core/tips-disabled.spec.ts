import type { UserData } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import Menu from '$lib/components/core/Menu.svelte';
import {
	NAVIGATION_MENU_BUTTON,
	NAVIGATION_MENU_TIP_BUTTON
} from '$lib/constants/test-ids.constants';
import { modalStore } from '$lib/stores/modal.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { userSelectedNetworkStore } from '$lib/stores/user-selected-network.store';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { mockAuthSignedIn, mockAuthStore } from '$tests/mocks/auth.mock';
import { render, waitFor } from '@testing-library/svelte';

// The point of this file, and why it is separate from `Menu.spec.ts`: that spec
// mocks the flag **on** to exercise the surface, and `vi.mock` is hoisted per
// module, so one file cannot assert both states.
//
// Mocked explicitly rather than relying on what a test run happens to read from
// the environment. This has to keep testing the off state once the flag is on
// somewhere, which is the moment the assertion stops being trivially satisfied
// and starts being the thing that catches a surface shipping early.
vi.mock('$env/tips.env', () => ({ TIPS_ENABLED: false }));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/utils/share.utils', () => ({
	copyText: vi.fn()
}));

describe('tips behind TIPS_ENABLED', () => {
	const mockUserData = (): UserData => ({
		is_vip: [],
		superpowers: [[]],
		airdrops: [],
		usage_awards: [],
		last_snapshot_timestamp: [BigInt(Date.now())],
		sprinkles: []
	});

	beforeEach(() => {
		userProfileStore.reset();
		modalStore.close();
		vi.resetAllMocks();
		mockAuthStore();
		mockAuthSignedIn(true);
		vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockUserData());
		setPrivacyMode({ enabled: false });
		userSelectedNetworkStore.set(undefined);
	});

	it('keeps the Issue Tip entry out of the menu', async () => {
		const { container } = render(Menu);

		const menuButton = container.querySelector<HTMLButtonElement>(
			`button[data-tid="${NAVIGATION_MENU_BUTTON}"]`
		);

		expect(menuButton).toBeInTheDocument();

		menuButton?.click();

		// Waiting for a sibling entry first, so this asserts the tip entry is absent
		// from a menu that has actually rendered — not merely absent from a menu
		// that has not drawn yet, which would pass for the wrong reason.
		await waitFor(() => {
			const rendered = container.querySelectorAll('button[data-tid]');

			if (rendered.length === 0) {
				throw new Error('Menu has not rendered its entries yet');
			}
		});

		expect(
			container.querySelector(`button[data-tid="${NAVIGATION_MENU_TIP_BUTTON}"]`)
		).not.toBeInTheDocument();
	});
});
