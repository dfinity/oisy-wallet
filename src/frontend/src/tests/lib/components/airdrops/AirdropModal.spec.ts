import type { AirdropDescription } from '$env/types/env-airdrop';
import AirdropModal from '$lib/components/airdrops/AirdropModal.svelte';
import { AIRDROPS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
import { mockAirdropCampaigns } from '$tests/mocks/airdrop-campaigns.mock';
import { render } from '@testing-library/svelte';

describe('AirdropModal', () => {
	const imageBannerSelector = `img[data-tid="${AIRDROPS_MODAL_IMAGE_BANNER}"]`;

	it('should render modal content', () => {
		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: {
				userAgentData: {
					mobile: false
				}
			}
		});

		const mockedAirdrop: AirdropDescription = { ...mockAirdropCampaigns[0] };

		const { container, getByText } = render(AirdropModal, {
			props: {
				airdrop: mockedAirdrop
			}
		});

		expect(getByText(mockedAirdrop.title)).toBeInTheDocument();
		expect(getByText(mockedAirdrop.description)).toBeInTheDocument();
		mockedAirdrop.requirements.forEach((requirement: string) => {
			expect(getByText(requirement)).toBeInTheDocument();
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);
		expect(imageBanner).toBeInTheDocument();
	});
});
