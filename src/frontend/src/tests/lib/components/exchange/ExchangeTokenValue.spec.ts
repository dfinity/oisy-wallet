import { BTC_MAINNET_NETWORK, BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import type { CardData } from '$lib/types/token-card';
import { render } from '@testing-library/svelte';

describe('ExchangeTokenValue', () => {
	const data: CardData = {
		name: 'Bitcoin',
		symbol: 'BTC',
		decimals: 8,
		network: BTC_MAINNET_NETWORK,
		balance: 100000000n,
		usdBalance: 1234.56
	} as unknown as CardData;

	beforeEach(() => {
		failedAddresses.reset();
	});

	// The USD column has the same stale-cache problem as the token amount: a cached balance would
	// otherwise be priced and presented as a current figure for a chain that cannot transact.
	it('should not show a USD figure once the chain has failed', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		const { container, queryByText } = render(ExchangeTokenValue, { props: { data } });

		expect(container).toHaveTextContent('-');
		expect(queryByText(/1,234/)).not.toBeInTheDocument();
	});

	it('should not suppress the USD figure of a chain that did not fail', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		const { queryByText } = render(ExchangeTokenValue, {
			props: { data: { ...data, network: ETHEREUM_NETWORK, symbol: 'ETH' } }
		});

		expect(queryByText('-')).not.toBeInTheDocument();
	});
});
