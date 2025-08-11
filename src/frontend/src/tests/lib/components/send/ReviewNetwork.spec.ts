import {
	BTC_MAINNET_NETWORK,
	BTC_TESTNET_NETWORK,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('ReviewNetwork', () => {
	const props = {
		sourceNetwork: BTC_MAINNET_NETWORK
	};

	it('renders data correctly if destinationNetworkId is not provided', () => {
		const { container } = render(ReviewNetwork, {
			props
		});

		expect(container).toHaveTextContent(en.send.text.network);

		expect(container).toHaveTextContent(props.sourceNetwork.name);
	});

	it('renders data correctly if destinationNetworkId is provided', () => {
		const { container } = render(ReviewNetwork, {
			props: {
				...props,
				destinationNetworkId: BTC_TESTNET_NETWORK_ID
			}
		});

		expect(container).toHaveTextContent(en.send.text.source_network);

		expect(container).toHaveTextContent(props.sourceNetwork.name);

		expect(container).toHaveTextContent(BTC_TESTNET_NETWORK.name);
	});
});
