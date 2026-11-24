import type { Settings, UserProfile } from '$declarations/backend/backend.did';
import * as dapps from '$env/dapp-descriptions.env';
import * as rewards from '$env/reward-campaigns.env';
import {
	FEATURED_REWARD_CAROUSEL_SLIDE_ID,
	SPRINKLES_SEASON_1_EPISODE_6_ID
} from '$env/reward-campaigns.env';
import DappsCarousel from '$lib/components/dapps/DappsCarousel.svelte';
import { CAROUSEL_CONTAINER } from '$lib/constants/test-ids.constants';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { mockDappsDescriptions } from '$tests/mocks/dapps.mock';
import en from '$tests/mocks/i18n.mock';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { nonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('DappsCarousel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();

		userProfileStore.set({ profile: mockUserProfile, certified: false });
	});

	it('should render nothing if there are no dApps and no rewards', () => {
		vi.spyOn(dapps, 'dAppDescriptions', 'get').mockReturnValue([]);
		vi.spyOn(rewards, 'rewardCampaigns', 'get').mockReturnValue([]);

		const { container } = render(DappsCarousel);

		expect(container.textContent).toBe('');
	});

	it('should render nothing if no dApps have the carousel prop and no rewards', () => {
		vi.spyOn(rewards, 'rewardCampaigns', 'get').mockReturnValue([]);
		vi.spyOn(dapps, 'dAppDescriptions', 'get').mockReturnValue(
			mockDappsDescriptions.map((dapp) => ({ ...dapp, carousel: undefined }))
		);

		const { container } = render(DappsCarousel);

		expect(container.textContent).toBe('');
	});

	it('should render nothing if there are no dApps and the featured reward is unknown', () => {
		vi.spyOn(rewards, 'FEATURED_REWARD_CAROUSEL_SLIDE_ID', 'get').mockReturnValue(
			'test' as typeof FEATURED_REWARD_CAROUSEL_SLIDE_ID
		);
		vi.spyOn(dapps, 'dAppDescriptions', 'get').mockReturnValue([]);

		const { container } = render(DappsCarousel);

		expect(container.textContent).toBe('');
	});

	it('should render nothing if all slides were hidden', () => {
		const settings: Settings = {
			...mockUserSettings,
			dapp: {
				...mockUserSettings.dapp,
				dapp_carousel: {
					...mockUserSettings.dapp.dapp_carousel,
					hidden_dapp_ids: [
						FEATURED_REWARD_CAROUSEL_SLIDE_ID,
						...mockDappsDescriptions.map(({ id }) => id)
					]
				}
			}
		};

		const userProfile: UserProfile = {
			...mockUserProfile,
			settings: toNullable(settings)
		};

		userProfileStore.set({ profile: userProfile, certified: false });

		const { container } = render(DappsCarousel);

		expect(container.textContent).toBe('');
	});

	it('should render nothing if the user profile is nullish', () => {
		userProfileStore.reset();

		const { container } = render(DappsCarousel);

		expect(container.textContent).toBe('');
	});

	it('should render the Carousel if the user settings are null', () => {
		const userProfile: UserProfile = {
			...mockUserProfile,
			settings: []
		};

		userProfileStore.set({ profile: userProfile, certified: false });

		const { getByTestId } = render(DappsCarousel);

		expect(getByTestId(CAROUSEL_CONTAINER)).toBeInTheDocument();
	});

	it('should render the Carousel when data exist', () => {
		const { getByTestId } = render(DappsCarousel);

		expect(getByTestId(CAROUSEL_CONTAINER)).toBeInTheDocument();
	});

	it('should keep the featured reward card when a dApp card is closed', async () => {
		vi.spyOn(rewards, 'FEATURED_REWARD_CAROUSEL_SLIDE_ID', 'get').mockReturnValue(
			SPRINKLES_SEASON_1_EPISODE_6_ID as typeof FEATURED_REWARD_CAROUSEL_SLIDE_ID
		);
		vi.spyOn(dapps, 'dAppDescriptions', 'get').mockReturnValue(
			mockDappsDescriptions.filter(({ carousel }) => nonNullish(carousel)).slice(0, 2)
		);

		const { getAllByRole, getByText } = render(DappsCarousel);

		const closeButtons = getAllByRole('button', { name: en.core.text.close });

		expect(closeButtons).toHaveLength(3);

		// The first dApp card, right after the reward card.
		await fireEvent.click(closeButtons[1]);

		expect(getAllByRole('button', { name: en.core.text.close })).toHaveLength(2);
		expect(
			getByText(replaceOisyPlaceholders(en.rewards.text.carousel_slide_title))
		).toBeInTheDocument();
	});
});
