import { goto } from '$app/navigation';
import type { Settings, UserProfile } from '$declarations/backend/backend.did';
import * as dapps from '$env/dapp-descriptions.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import * as rewards from '$env/reward-campaigns.env';
import {
	FEATURED_REWARD_CAROUSEL_SLIDE_ID,
	SPRINKLES_SEASON_1_EPISODE_6_ID
} from '$env/reward-campaigns.env';
import * as ckSolEnv from '$env/tokens/tokens-icrc/tokens.icrc.ck.sol.env';
import {
	IC_CKSOL_INDEX_CANISTER_ID,
	IC_CKSOL_LEDGER_CANISTER_ID,
	IC_CKSOL_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.sol.env';
import { CKSOL_CAROUSEL_SLIDE_ID } from '$icp/constants/cksol.constants';
import type { IcCkInterface, IcToken } from '$icp/types/ic-token';
import DappsCarousel from '$lib/components/dapps/DappsCarousel.svelte';
import { CAROUSEL_CONTAINER } from '$lib/constants/test-ids.constants';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { transactionsUrl } from '$lib/utils/nav.utils';
import { mockDappsDescriptions } from '$tests/mocks/dapps.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { nonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn(),
	goto: vi.fn()
}));

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

	describe('ckSOL card', () => {
		const ckSolIcData: IcCkInterface = {
			ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID,
			indexCanisterId: IC_CKSOL_INDEX_CANISTER_ID,
			minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID
		};

		const ckSolTitle = en.carousel.text.cksol_slide_title;

		beforeEach(() => {
			vi.spyOn(ckSolEnv, 'CKSOL_IC_DATA', 'get').mockReturnValue(ckSolIcData);
		});

		it('should show the ckSOL card first', () => {
			const { container } = render(DappsCarousel);

			const [firstLogo] = container.querySelectorAll('img');

			expect(firstLogo).toHaveAttribute(
				'alt',
				replacePlaceholders(en.dapps.alt.logo, { $dAppName: 'ckSOL' })
			);
		});

		it('should open the ckSOL token page', async () => {
			const { getByRole } = render(DappsCarousel);

			// The button goes by its visible text, which already names ckSOL.
			await fireEvent.click(getByRole('button', { name: en.carousel.text.cksol_slide_cta }));

			const ckSolToken: IcToken = {
				...mockValidIcrcToken,
				ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID,
				network: ICP_NETWORK
			};

			// The same link as the ckSOL row in the token list.
			expect(goto).toHaveBeenCalledExactlyOnceWith(transactionsUrl({ token: ckSolToken }));
		});

		it('should keep naming a generic call to action after its dApp', () => {
			const { getByRole } = render(DappsCarousel);

			// "Learn more" does not say which card it belongs to.
			expect(
				getByRole('button', {
					name: replacePlaceholders(en.dapps.alt.learn_more, {
						$dAppName: en.dapps.descriptions.caffeine.name
					})
				})
			).toHaveTextContent(en.dapps.descriptions.caffeine.carousel.call_to_action);
		});

		it('should not show the ckSOL card once the user closed it', () => {
			const settings: Settings = {
				...mockUserSettings,
				dapp: {
					...mockUserSettings.dapp,
					dapp_carousel: {
						...mockUserSettings.dapp.dapp_carousel,
						hidden_dapp_ids: [CKSOL_CAROUSEL_SLIDE_ID]
					}
				}
			};

			userProfileStore.set({
				profile: { ...mockUserProfile, settings: toNullable(settings) },
				certified: false
			});

			const { getByTestId, queryByText } = render(DappsCarousel);

			expect(getByTestId(CAROUSEL_CONTAINER)).toBeInTheDocument();
			expect(queryByText(ckSolTitle)).not.toBeInTheDocument();
		});

		it('should keep the ckSOL card when another card is closed', async () => {
			vi.spyOn(dapps, 'dAppDescriptions', 'get').mockReturnValue(
				mockDappsDescriptions.filter(({ carousel }) => nonNullish(carousel)).slice(0, 2)
			);

			const { getAllByRole, getByText } = render(DappsCarousel);

			const closeButtons = getAllByRole('button', { name: en.core.text.close });

			expect(closeButtons).toHaveLength(3);

			// The first dApp card, right after the ckSOL card.
			await fireEvent.click(closeButtons[1]);

			expect(getAllByRole('button', { name: en.core.text.close })).toHaveLength(2);
			expect(getByText(ckSolTitle)).toBeInTheDocument();
		});

		it('should not show the ckSOL card where there is no ckSOL token', () => {
			vi.spyOn(ckSolEnv, 'CKSOL_IC_DATA', 'get').mockReturnValue(undefined);

			const { getByTestId, queryByText } = render(DappsCarousel);

			expect(getByTestId(CAROUSEL_CONTAINER)).toBeInTheDocument();
			expect(queryByText(ckSolTitle)).not.toBeInTheDocument();
		});
	});
});
