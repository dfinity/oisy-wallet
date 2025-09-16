import RewardNetworkBonus from '$lib/components/rewards/RewardNetworkBonus.svelte';
import { render } from '@testing-library/svelte';
import { REWARDS_NETWORK_MULTIPLIER_IMAGE } from '$lib/constants/test-ids.constants';
import networkBonusActive1 from '$lib/assets/rewards/network-bonus-active-1.svg';
import networkBonusActive2 from '$lib/assets/rewards/network-bonus-active-2.svg';
import networkBonusActive3 from '$lib/assets/rewards/network-bonus-active-3.svg';
import networkBonusActive4 from '$lib/assets/rewards/network-bonus-active-4.svg';
import networkBonusActive5 from '$lib/assets/rewards/network-bonus-active-5.svg';
import networkBonusActive6 from '$lib/assets/rewards/network-bonus-active-6.svg';
import networkBonusActive7 from '$lib/assets/rewards/network-bonus-active-7.svg';
import networkBonusActive8 from '$lib/assets/rewards/network-bonus-active-8.svg';
import networkBonusDisabled1 from '$lib/assets/rewards/network-bonus-disabled-1.svg';
import networkBonusDisabled2 from '$lib/assets/rewards/network-bonus-disabled-2.svg';
import networkBonusDisabled3 from '$lib/assets/rewards/network-bonus-disabled-3.svg';
import networkBonusDisabled4 from '$lib/assets/rewards/network-bonus-disabled-4.svg';
import networkBonusDisabled5 from '$lib/assets/rewards/network-bonus-disabled-5.svg';
import networkBonusDisabled6 from '$lib/assets/rewards/network-bonus-disabled-6.svg';
import networkBonusDisabled7 from '$lib/assets/rewards/network-bonus-disabled-7.svg';
import networkBonusDisabled8 from '$lib/assets/rewards/network-bonus-disabled-8.svg';

describe('RewardNetworkBonus', () => {
	const rewardNetworkBonusImageSelector = `img[data-tid="${REWARDS_NETWORK_MULTIPLIER_IMAGE}"]`;

	const expectedActiveImages: Record<number, string> = {
		1: networkBonusActive1,
		2: networkBonusActive2,
		3: networkBonusActive3,
		4: networkBonusActive4,
		5: networkBonusActive5,
		6: networkBonusActive6,
		7: networkBonusActive7,
		8: networkBonusActive8,
	};

	const expectedDisabledImages: Record<number, string> = {
		1: networkBonusDisabled1,
		2: networkBonusDisabled2,
		3: networkBonusDisabled3,
		4: networkBonusDisabled4,
		5: networkBonusDisabled5,
		6: networkBonusDisabled6,
		7: networkBonusDisabled7,
		8: networkBonusDisabled8,
	};

	it.each([1, 2, 3, 4, 5, 6, 7, 8])('should display correct active image for multiplier %i', (multiplier) => {
		const {container} = render(RewardNetworkBonus, {
			props: {
				isEligible: true,
				multiplier
			}
		})

		const rewardNetworkBonusImage: HTMLImageElement | null = container.querySelector(
			rewardNetworkBonusImageSelector
		);

		expect(rewardNetworkBonusImage).toBeInTheDocument();
		expect(rewardNetworkBonusImage?.src).toContain(expectedActiveImages[multiplier]);
	});

	it.each([1, 2, 3, 4, 5, 6, 7, 8])('should display correct disabled image for multiplier %i', (multiplier) => {
		const {container} = render(RewardNetworkBonus, {
			props: {
				isEligible: false,
				multiplier
			}
		})

		const rewardNetworkBonusImage: HTMLImageElement | null = container.querySelector(
			rewardNetworkBonusImageSelector
		);

		expect(rewardNetworkBonusImage).toBeInTheDocument();
		expect(rewardNetworkBonusImage?.src).toContain(expectedDisabledImages[multiplier]);
	});
});