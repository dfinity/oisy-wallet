import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import NetworkSwitcherList from '$lib/components/networks/NetworkSwitcherList.svelte';
import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';

describe('NetworkSwitcherList', () => {
	const props = {
		allNetworksEnabled: false,
		showTestnets: false,
		supportedNetworks: [ETHEREUM_NETWORK, BTC_MAINNET_NETWORK]
	};

	const getItems = (container: HTMLElement): NodeListOf<HTMLElement> =>
		container.querySelectorAll('li.logo-button-list-item');

	it('should render one item per supported network', () => {
		const { container } = render(NetworkSwitcherList, { props });

		expect(getItems(container)).toHaveLength(2);
	});

	describe('slide transition', () => {
		it('should keep a removed network mounted and animate it out', async () => {
			const { container, rerender } = render(NetworkSwitcherList, { props });

			await rerender({ ...props, supportedNetworks: [ETHEREUM_NETWORK] });

			// `overflow: hidden` is the inline style Svelte's slide sets for the duration of the
			// transition, so its presence proves the item animates out instead of vanishing.
			await waitFor(() => {
				const [, removed] = Array.from(getItems(container));

				assertNonNullish(removed);

				expect(removed.style.overflow).toBe('hidden');
			});
		});

		it('should remove the network within the shared slide duration', async () => {
			const { container, rerender } = render(NetworkSwitcherList, { props });

			await rerender({ ...props, supportedNetworks: [ETHEREUM_NETWORK] });

			const { duration } = SLIDE_PARAMS;

			assertNonNullish(duration);

			await waitFor(
				() => {
					expect(getItems(container)).toHaveLength(1);
				},
				{ timeout: duration + 100 }
			);
		});
	});
});
