import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK, BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import type { CardData } from '$lib/types/token-card';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('TokenBalance', () => {
	const data: CardData = {
		name: 'Bitcoin',
		symbol: 'BTC',
		decimals: 8,
		network: BTC_MAINNET_NETWORK,
		balance: undefined,
		usdBalance: undefined,
		usdPrice: undefined,
		usdMarketCap: undefined,
		usdPriceChangePercentage24h: undefined,
		icon: undefined,
		oisyName: undefined,
		oisySymbol: undefined
	} as unknown as CardData;

	beforeEach(() => {
		failedAddresses.reset();
	});

	it('should render the balance when it is available', () => {
		const { getByText } = render(TokenBalance, {
			props: { data: { ...data, balance: 100000000n } }
		});

		expect(getByText('1')).toBeInTheDocument();
	});

	// A chain that is merely still loading must keep its skeleton: claiming unavailability here would
	// be wrong for every normal startup.
	it('should not claim unavailability while the balance is merely still loading', () => {
		const { queryByText } = render(TokenBalance, { props: { data } });

		expect(queryByText(en.tokens.balance.error.not_applicable)).not.toBeInTheDocument();
	});

	// The gap this fixes: with no address the balance never arrives, so the row shimmered forever —
	// reading as "almost there" rather than "this will not load".
	it('should show n/a instead of a skeleton once the chain has failed', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		const { getByText } = render(TokenBalance, { props: { data } });

		expect(getByText(en.tokens.balance.error.not_applicable)).toBeInTheDocument();
	});

	// The worse half of the gap: balances are cached in IndexedDB and restored independently of the
	// address, so a failed chain could present a stale figure as if it were current.
	it('should show n/a rather than a stale cached balance once the chain has failed', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		const { getByText, queryByText } = render(TokenBalance, {
			props: { data: { ...data, balance: 100000000n } }
		});

		expect(getByText(en.tokens.balance.error.not_applicable)).toBeInTheDocument();
		expect(queryByText('1')).not.toBeInTheDocument();
	});

	it('should keep showing the balance of a chain that did not fail', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		const { getByText } = render(TokenBalance, {
			props: {
				data: { ...data, network: ETHEREUM_NETWORK, symbol: 'ETH', balance: 100000000n }
			}
		});

		expect(getByText('1')).toBeInTheDocument();
	});

	// The Ethereum address serves every EVM chain, so a Base row has to read as unavailable too —
	// otherwise a user with Base assets sees a stale balance for a chain that cannot transact.
	it('should show n/a for an EVM chain when the Ethereum address failed', () => {
		failedAddresses.add(ETHEREUM_NETWORK_ID);

		const { getByText, queryByText } = render(TokenBalance, {
			props: { data: { ...data, network: BASE_NETWORK, symbol: 'ETH', balance: 100000000n } }
		});

		expect(getByText(en.tokens.balance.error.not_applicable)).toBeInTheDocument();
		expect(queryByText('1')).not.toBeInTheDocument();
	});

	// A group spanning a failed chain and a working one has a partial balance rather than an absent
	// one. Presenting the total as n/a would hide the part that is genuinely known.
	it('should leave a token group untouched', () => {
		failedAddresses.add(BTC_MAINNET_NETWORK_ID);

		const { getByText } = render(TokenBalance, {
			props: {
				data: {
					...data,
					network: undefined,
					networks: [BTC_MAINNET_NETWORK, ETHEREUM_NETWORK],
					balance: 100000000n
				}
			}
		});

		expect(getByText('1')).toBeInTheDocument();
	});
});
