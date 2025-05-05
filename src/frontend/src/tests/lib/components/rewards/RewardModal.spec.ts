import type { RewardDescription } from '$env/types/env-reward';
import RewardModal from '$lib/components/rewards/RewardModal.svelte';
import { REWARDS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { render } from '@testing-library/svelte';

describe('RewardModal', () => {
	const imageBannerSelector = `img[data-tid="${REWARDS_MODAL_IMAGE_BANNER}"]`;

	it('should render active modal content', () => {
		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: {
				userAgentData: {
					mobile: false
				}
			}
		});

		const mockedReward: RewardDescription = { ...mockRewardCampaigns[0] };

		const { container, getByText } = render(RewardModal, {
			props: {
				reward: mockedReward
			}
		});

		expect(getByText(mockedReward.title)).toBeInTheDocument();
		expect(getByText(mockedReward.description)).toBeInTheDocument();

		mockedReward.requirements.forEach((requirement: string) => {
			expect(getByText(requirement)).toBeInTheDocument();
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
	});

	it('should render ended modal content', () => {
		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: {
				userAgentData: {
					mobile: false
				}
			}
		});

		const mockedReward: RewardDescription = { ...mockRewardCampaigns[2] };

		const { container, getByText, queryByText } = render(RewardModal, {
			props: {
				reward: mockedReward
			}
		});

		expect(getByText(mockedReward.title)).toBeInTheDocument();
		expect(getByText(mockedReward.description)).toBeInTheDocument();

		mockedReward.requirements.forEach((requirement: string) => {
			expect(queryByText(requirement)).not.toBeInTheDocument();
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
	});
});
