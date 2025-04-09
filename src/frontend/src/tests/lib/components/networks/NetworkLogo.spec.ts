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

		const logo = getByTestId(`${testId}-light`);
		expect(logo).toBeTruthy();
	});

	it('should render the Logo component with correct props', () => {
		const { getByTestId } = render(NetworkLogo, {
			props: {
				network: mockNetwork,
				testId
			}
		});

		const logo = getByTestId(`${testId}-light`);

		expect(logo).toBeVisible();
	});

	it('should render dark mode icon in dark mode', () => {
		const { getByTestId } = render(NetworkLogo, {
			props: {
				network: mockNetwork,
				testId
			}
		});

		const logoLight = getByTestId(`${testId}-light`);
		const logoDark = getByTestId(`${testId}-dark`);

		const logoLightIsHiddenOnDark = logoLight.parentElement?.classList.contains('dark-hidden');
		const logoDarkIsShownOnDark = logoDark.parentElement?.classList.contains('dark-block');

		expect(logoLightIsHiddenOnDark).toBeTruthy();
		expect(logoDarkIsShownOnDark).toBeTruthy();
	});
});
