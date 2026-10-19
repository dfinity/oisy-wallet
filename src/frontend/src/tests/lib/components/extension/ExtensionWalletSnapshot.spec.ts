import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import ExtensionWalletSnapshot from '$lib/components/extension/ExtensionWalletSnapshot.svelte';
import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
import * as currencyDerived from '$lib/derived/currency.derived';
import * as settingsDerived from '$lib/derived/settings.derived';
import { Currency } from '$lib/enums/currency';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { ExtensionPanelSnapshot } from '$lib/types/extension';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

const snapshot: ExtensionPanelSnapshot = {
	savedAt: Date.now(),
	usdTotal: 1234.5,
	currency: Currency.USD,
	exchangeRateToUsd: 1,
	rows: [
		{
			name: 'Ethereum',
			symbol: 'ETH',
			decimals: 18,
			balance: 1_000_000_000_000_000_000n,
			usdBalance: 1000,
			networkId: `${ETHEREUM_NETWORK.id.description}`
		},
		{
			name: 'USDC',
			symbol: 'USDC',
			decimals: 6,
			balance: 234_500_000n,
			usdBalance: 234.5,
			groupNetworkIds: [`${ETHEREUM_NETWORK.id.description}`, `${ICP_NETWORK.id.description}`]
		}
	]
};

describe('ExtensionWalletSnapshot', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		exchangeStore.reset();
		vi.spyOn(settingsDerived, 'isPrivacyMode', 'get').mockReturnValue(readable(false));
	});

	it('shows the saved total and when it was saved', () => {
		const { getByText } = render(ExtensionWalletSnapshot, { props: { snapshot } });

		expect(getByText('$1,234.50')).toBeInTheDocument();
		expect(getByText(/^Last updated /)).toBeInTheDocument();
	});

	it('shows the saved rows with OISY token cards', () => {
		const { getByTestId } = render(ExtensionWalletSnapshot, { props: { snapshot } });

		expect(getByTestId(`${TOKEN_CARD}-ETH-${ETHEREUM_NETWORK.id.description}`)).toBeInTheDocument();
		expect(getByTestId(`${TOKEN_CARD}-USDC`)).toBeInTheDocument();
	});

	it('offers to sign in for current balances', () => {
		const { getByText } = render(ExtensionWalletSnapshot, { props: { snapshot } });

		expect(getByText(en.extension.panel.sign_in_to_refresh)).toBeInTheDocument();
	});

	it('hides the total in privacy mode', () => {
		vi.spyOn(settingsDerived, 'isPrivacyMode', 'get').mockReturnValue(readable(true));

		const { queryByText } = render(ExtensionWalletSnapshot, { props: { snapshot } });

		expect(queryByText('$1,234.50')).not.toBeInTheDocument();
	});

	it('lends the saved exchange rate to the rows', () => {
		vi.spyOn(currencyDerived, 'currentCurrency', 'get').mockReturnValue(readable(Currency.EUR));

		render(ExtensionWalletSnapshot, {
			props: { snapshot: { ...snapshot, currency: Currency.EUR, exchangeRateToUsd: 0.9 } }
		});

		expect(get(currencyExchangeStore)).toEqual(
			expect.objectContaining({ currency: Currency.EUR, exchangeRateToUsd: 0.9 })
		);
	});

	it('shows the saved fiat values instead of waiting for live prices', () => {
		const { getByText } = render(ExtensionWalletSnapshot, { props: { snapshot } });

		expect(getByText('$1,000.00')).toBeInTheDocument();
		expect(getByText('$234.50')).toBeInTheDocument();
	});
});
