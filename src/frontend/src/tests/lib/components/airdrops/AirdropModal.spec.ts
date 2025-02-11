import AirdropModal from '$lib/components/airdrops/AirdropModal.svelte';
import { AIRDROPS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
import { mockAirdropEvents } from '$tests/mocks/airdrop-events.mock';
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

		const title = 'myTitle';
		const description = 'my description';
		const requirements = ['step 1', 'step 2'];
		const mockedAirdrop = { ...mockAirdropEvents[0], title, description, requirements };

		const { container, getByText } = render(AirdropModal, {
			props: {
				airdrop: mockedAirdrop
			}
		});

		expect(getByText(title)).toBeInTheDocument();
		expect(getByText(description)).toBeInTheDocument();
		requirements.forEach((requirement) => {
			expect(getByText(requirement)).toBeInTheDocument();
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);
		expect(imageBanner).toBeInTheDocument();
	});
});
