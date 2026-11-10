import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockColoredNetworkLogosContextEntry } from '$tests/utils/misc.context.test-utils';
import type { Nullish } from '@dfinity/zod-schemas';
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

	describe('on a screen that tells networks apart by colour', () => {
		const coloredScreen = mockContextMap([mockColoredNetworkLogosContextEntry()]);

		const getSrc = (container: HTMLElement): Nullish<string> =>
			container.querySelector('img')?.getAttribute('src');

		it('should render the monochrome mark elsewhere, even when a coloured one exists', () => {
			const { container } = render(NetworkLogo, {
				props: { network: ETHEREUM_NETWORK, testId }
			});

			expect(getSrc(container)).toBe(ETHEREUM_NETWORK.icon);
			expect(container.querySelector('.invert-on-dark-theme')).not.toBeNull();
		});

		it('should render the coloured mark and never invert it', () => {
			const { container } = render(NetworkLogo, {
				props: { network: ETHEREUM_NETWORK, testId },
				context: coloredScreen
			});

			expect(ETHEREUM_NETWORK.iconColored).toBeDefined();
			expect(getSrc(container)).toBe(ETHEREUM_NETWORK.iconColored);
			expect(container.querySelector('.invert-on-dark-theme')).toBeNull();
		});

		it('should not invert the coloured mark when transparent and always inverted', () => {
			const { container } = render(NetworkLogo, {
				props: { network: ETHEREUM_NETWORK, testId, transparent: true, alwaysInverted: true },
				context: coloredScreen
			});

			expect(getSrc(container)).toBe(ETHEREUM_NETWORK.iconColored);
			expect(container.querySelector('.invert-on-dark-theme')).toBeNull();
			expect(container.querySelector('.always-inverted')).toBeNull();
		});

		// Neither network has a token logo of its own (both pay gas in ETH), so each has a brand mark.
		it.each([BASE_NETWORK, ROBINHOOD_MAINNET_NETWORK])(
			'should render the coloured mark of $name, which has no token logo of its own',
			(network) => {
				const { container } = render(NetworkLogo, {
					props: { network, testId },
					context: coloredScreen
				});

				expect(network.iconColored).toBeDefined();
				expect(network.iconColored).not.toBe(network.icon);
				expect(getSrc(container)).toBe(network.iconColored);
				expect(container.querySelector('.invert-on-dark-theme')).toBeNull();
			}
		);

		it('should fall back to the monochrome mark for a network without a coloured one', () => {
			const network = { ...BASE_NETWORK, iconColored: undefined };

			const { container } = render(NetworkLogo, {
				props: { network, testId },
				context: coloredScreen
			});

			expect(getSrc(container)).toBe(network.icon);
			expect(container.querySelector('.invert-on-dark-theme')).not.toBeNull();
		});
	});
});
