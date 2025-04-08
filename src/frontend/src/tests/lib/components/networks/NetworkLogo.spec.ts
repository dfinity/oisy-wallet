import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('NetworkLogo', () => {
	const mockNetwork = ICP_NETWORK;
	const testId = 'test-logo';
	const altText = replacePlaceholders(en.core.alt.logo, { $name: mockNetwork.name });

	it('should apply testId as a data attribute', () => {
		const { getByTestId } = render(NetworkLogo, {
			props: {
				network: mockNetwork,
				testId
			}
		});

		const logo = getByTestId(testId);
		expect(logo).toBeTruthy();
	});

	it('should render the Logo component with correct props', () => {
		const { getByAltText } = render(NetworkLogo, {
			props: {
				network: mockNetwork,
				testId
			}
		});

		const logo = getByAltText(altText);

		expect(logo).toBeInTheDocument();
		expect(logo).toHaveAttribute('src', ICP_NETWORK.icon);
	});

	it('should render black and white icon when blackAndWhite is true', () => {
		const { getByAltText } = render(NetworkLogo, {
			props: {
				network: mockNetwork,
				blackAndWhite: true,
				testId
			}
		});

		const logo = getByAltText(altText);

		expect(logo).toBeInTheDocument();
		expect(logo).toHaveAttribute('src', ICP_NETWORK.iconBW);
	});
});
