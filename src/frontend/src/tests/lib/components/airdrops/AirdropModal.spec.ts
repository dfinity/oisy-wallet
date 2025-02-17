import type { AirdropDescription } from '$env/types/env-airdrop';
import AirdropModal from '$lib/components/airdrops/AirdropModal.svelte';
import { mockAirdropCampaigns } from '$tests/mocks/airdrop-campaigns.mock';
import { render } from '@testing-library/svelte';

describe('AirdropModal', () => {
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

		const { getByText } = render(AirdropModal, {
			props: {
				airdrop: mockedAirdrop
			}
		});

		expect(getByText(mockedAirdrop.title)).toBeInTheDocument();
		expect(getByText(mockedAirdrop.description)).toBeInTheDocument();
		mockedAirdrop.requirements.forEach((requirement: string) => {
			expect(getByText(requirement)).toBeInTheDocument();
		});

		// TODO check if image banner is displayed
	});
});
