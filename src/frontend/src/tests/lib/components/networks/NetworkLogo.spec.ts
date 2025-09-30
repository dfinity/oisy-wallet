import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
import { render } from '@testing-library/svelte';

describe('NetworkLogo', () => {
	const mockNetwork = ICP_NETWORK;
	const testId = 'test-logo';

	it('should apply testId as a data attribute', () => {
		const { getByTestId } = render(NetworkLogo, {
			props: {
				network: mockNetwork,
				testId
			}
		});

		const logo = getByTestId(`${testId}-default`);

		expect(logo).toBeTruthy();
	});

	it('should render the Logo component with correct props', () => {
		const { getByTestId } = render(NetworkLogo, {
			props: {
				network: mockNetwork,
				testId
			}
		});

		const logo = getByTestId(`${testId}-default`);

		expect(logo).toBeVisible();
	});
});
