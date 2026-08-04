import { BTC_MAINNET_NETWORK, BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('ReceiveAddress', () => {
	const title = createRawSnippet(() => ({ render: () => '<span>Bitcoin</span>' }));

	const props = {
		title,
		labelRef: 'btcAddressMainnet',
		network: BTC_MAINNET_NETWORK,
		copyAriaLabel: 'copy',
		qrCodeAction: { enabled: false as const }
	};

	beforeEach(() => {
		failedAddresses.reset();
	});

	it('should render the address when it is available', () => {
		const { getByText } = render(ReceiveAddress, {
			props: { ...props, address: 'bc1qexampleaddress' }
		});

		expect(getByText('bc1qexampleaddress')).toBeInTheDocument();
	});

	// A chain that is still loading must keep the skeleton — only a chain we know has failed
	// should claim to be unavailable.
	it('should not claim unavailability while the address is merely still loading', () => {
		const { queryByText } = render(ReceiveAddress, { props: { ...props, address: undefined } });

		expect(queryByText(en.core.text.not_available)).not.toBeInTheDocument();
	});

	// Without this the failed chain showed a loading skeleton forever, which reads as "almost
	// there" rather than "this will not load".
	it('should show n/a instead of a skeleton once the chain has failed', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		const { getByText } = render(ReceiveAddress, { props: { ...props, address: undefined } });

		expect(getByText(en.core.text.not_available)).toBeInTheDocument();
	});

	it('should prefer a loaded address over the failed marker', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		const { getByText, queryByText } = render(ReceiveAddress, {
			props: { ...props, address: 'bc1qexampleaddress' }
		});

		expect(getByText('bc1qexampleaddress')).toBeInTheDocument();
		expect(queryByText(en.core.text.not_available)).not.toBeInTheDocument();
	});
});
