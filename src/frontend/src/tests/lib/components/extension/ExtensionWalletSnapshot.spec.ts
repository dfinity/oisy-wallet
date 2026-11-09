import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import ExtensionWalletSnapshot from '$lib/components/extension/ExtensionWalletSnapshot.svelte';
import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
import * as currencyDerived from '$lib/derived/currency.derived';
import * as settingsDerived from '$lib/derived/settings.derived';
import { Currency } from '$lib/enums/currency';
import * as authServices from '$lib/services/auth.services';
import { ExchangeWorker } from '$lib/services/worker.exchange.services';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { ExtensionPanelSnapshot } from '$lib/types/extension';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get, readable } from 'svelte/store';

vi.mock('$lib/services/worker.exchange.services', () => ({
	ExchangeWorker: { init: vi.fn() }
}));

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

// 1 ETH, priced live through `ethereum`, and USDC without a price lookup.
const priced: ExtensionPanelSnapshot = {
	...snapshot,
	rows: [
		{
			...snapshot.rows[0],
			holdings: [
				{
					priceKey: 'ethereum',
					balance: 1_000_000_000_000_000_000n,
					decimals: 18,
					usdBalance: 1000
				}
			]
		},
		snapshot.rows[1]
	],
	holdings: [
		{ priceKey: 'ethereum', balance: 1_000_000_000_000_000_000n, decimals: 18, usdBalance: 1000 },
		{ balance: 234_500_000n, decimals: 6, usdBalance: 234.5 }
	],
	providersUsd: 0,
	prices: {
		erc20Addresses: [],
		icrcCanisterIds: ['mxzaz-hqaaa-aaaar-qaada-cai'],
		splAddresses: []
	}
};

describe('ExtensionWalletSnapshot', () => {
	const worker = { startExchangeTimer: vi.fn(), destroy: vi.fn() };

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		exchangeStore.reset();
		mockPage.mockUrl(new URL('http://localhost:5175/extension/panel/'));
		vi.spyOn(settingsDerived, 'isPrivacyMode', 'get').mockReturnValue(readable(false));
		vi.mocked(ExchangeWorker.init).mockResolvedValue(worker as unknown as ExchangeWorker);
	});

	it('shows the saved total, and that balances and prices are as saved', () => {
		const { getByText } = render(ExtensionWalletSnapshot, { props: { snapshot } });

		expect(getByText('$1,234.50')).toBeInTheDocument();
		expect(getByText(/^Balances and prices as of /)).toBeInTheDocument();
	});

	it("starts OISY's price worker on the public sources with the saved lookups", async () => {
		render(ExtensionWalletSnapshot, { props: { snapshot: priced } });

		await waitFor(() =>
			expect(worker.startExchangeTimer).toHaveBeenCalledExactlyOnceWith({
				currentCurrency: Currency.USD,
				erc20Addresses: [],
				icrcCanisterIds: ['mxzaz-hqaaa-aaaar-qaada-cai'],
				splAddresses: [],
				erc4626TokensExchangeData: [],
				backendExchangeEnabled: false
			})
		);
	});

	it('starts no price worker for a snapshot without price lookups', async () => {
		render(ExtensionWalletSnapshot, { props: { snapshot } });
		await tick();

		expect(ExchangeWorker.init).not.toHaveBeenCalled();
	});

	it('values the wallet at live prices once they arrive', async () => {
		const { getByText, getAllByText } = render(ExtensionWalletSnapshot, {
			props: { snapshot: priced }
		});

		exchangeStore.set([{ ethereum: { usd: 3000, usd_24h_change: 2 } }]);
		await tick();

		// 1 ETH at $3,000 plus USDC as saved; the ETH row shows $3,000 as both price and value.
		expect(getByText('$3,234.50')).toBeInTheDocument();
		expect(getAllByText('$3,000.00')).toHaveLength(2);
		expect(getByText(/^Balances as of .* · prices live$/)).toBeInTheDocument();
	});

	it('stops the price worker when it closes', async () => {
		const { unmount } = render(ExtensionWalletSnapshot, { props: { snapshot: priced } });

		await waitFor(() => expect(worker.startExchangeTimer).toHaveBeenCalled());
		unmount();

		expect(worker.destroy).toHaveBeenCalledOnce();
	});

	it('shows the saved rows with OISY token cards', () => {
		const { getByTestId } = render(ExtensionWalletSnapshot, { props: { snapshot } });

		expect(getByTestId(`${TOKEN_CARD}-ETH-${ETHEREUM_NETWORK.id.description}`)).toBeInTheDocument();
		expect(getByTestId(`${TOKEN_CARD}-USDC`)).toBeInTheDocument();
	});

	it('offers a small sign-in link in place of recent activity', async () => {
		const signIn = vi.spyOn(authServices, 'signIn').mockResolvedValue({ success: 'ok' });
		const { getByText, getByRole, queryByText } = render(ExtensionWalletSnapshot, {
			props: { snapshot }
		});

		expect(getByText(en.extension.panel.sign_in_for_activity)).toBeInTheDocument();
		// No full sign-in block: the panel shows the wallet either way.
		expect(queryByText('Internet Identity')).not.toBeInTheDocument();

		await fireEvent.click(getByRole('button', { name: en.extension.panel.sign_in }));

		expect(signIn).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ asPopup: true }));
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
