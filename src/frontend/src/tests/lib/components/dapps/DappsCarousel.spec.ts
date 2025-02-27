import type { Settings, UserProfile } from '$declarations/backend/backend.did';
import * as airdrops from '$env/airdrop-campaigns.env';
import { FEATURED_AIRDROP_CAROUSEL_SLIDE_ID } from '$env/airdrop-campaigns.env';
import * as dapps from '$env/dapp-descriptions.env';
import DappsCarousel from '$lib/components/dapps/DappsCarousel.svelte';
import { CAROUSEL_CONTAINER } from '$lib/constants/test-ids.constants';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockDappsDescriptions } from '$tests/mocks/dapps.mock';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('DappsCarousel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();

		userProfileStore.set({ profile: mockUserProfile, certified: false });
	});

	it('should render nothing if there is no dApps and airdrops', () => {
		vi.spyOn(dapps, 'dAppDescriptions', 'get').mockReturnValue([]);
		vi.spyOn(airdrops, 'airdropCampaigns', 'get').mockReturnValue([]);

		const { container } = render(DappsCarousel);
		expect(container.textContent).toBe('');
	});

	it('should render nothing if no dApps has the carousel prop and no airdrops', () => {
		vi.spyOn(airdrops, 'airdropCampaigns', 'get').mockReturnValue([]);
		vi.spyOn(dapps, 'dAppDescriptions', 'get').mockReturnValue(
			mockDappsDescriptions.map((dapp) => ({ ...dapp, carousel: undefined }))
		);

		const { container } = render(DappsCarousel);
		expect(container.textContent).toBe('');
	});

	it('should render nothing if no dApps and featured airdrop is unknown', () => {
		vi.spyOn(airdrops, 'FEATURED_AIRDROP_CAROUSEL_SLIDE_ID', 'get').mockReturnValue(
			'test' as typeof FEATURED_AIRDROP_CAROUSEL_SLIDE_ID
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
						FEATURED_AIRDROP_CAROUSEL_SLIDE_ID,
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
});
