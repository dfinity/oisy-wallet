import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as icrcErc20Derived from '$icp-eth/derived/icrc-erc20.derived';
import * as icrcDerived from '$icp/derived/icrc.derived';
import ExtensionPanelSnapshotSetter from '$lib/components/extension/ExtensionPanelSnapshotSetter.svelte';
import { OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS } from '$lib/constants/extension.constants';
import * as balancesDerived from '$lib/derived/balances.derived';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as networkTokensUiDerived from '$lib/derived/network-tokens-ui.derived';
import { Currency } from '$lib/enums/currency';
import { saveExtensionPanelSnapshot } from '$lib/services/extension-panel.services';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { TokenUi } from '$lib/types/token-ui';
import * as splDerived from '$sol/derived/spl.derived';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$lib/services/extension-panel.services', () => ({
	saveExtensionPanelSnapshot: vi.fn()
}));

const eth: TokenUi = { ...ETHEREUM_TOKEN, balance: 1_000_000_000_000_000_000n, usdBalance: 2000 };
const ethPrice = { usd: 2000, usd_24h_change: 1 };
const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

describe('ExtensionPanelSnapshotSetter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		currencyExchangeStore.setExchangeRateCurrency(Currency.USD);
		vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
			readable([eth])
		);
		vi.spyOn(balancesDerived, 'providersUsdBalance', 'get').mockReturnValue(readable(50));
		vi.spyOn(balancesDerived, 'noPositiveBalanceAndNotAllBalancesZero', 'get').mockReturnValue(
			readable(false)
		);
		exchangeStore.reset();
		exchangeStore.set([{ ethereum: ethPrice }]);
		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(readable({ [eth.id]: ethPrice }));
		vi.spyOn(icrcErc20Derived, 'enabledMergedErc20TokensAddresses', 'get').mockReturnValue(
			readable([{ address: usdcAddress, coingeckoId: 'ethereum', chainId: 1n }])
		);
		vi.spyOn(icrcDerived, 'enabledIcrcLedgerCanisterIdsNoCk', 'get').mockReturnValue(
			readable(['mxzaz-hqaaa-aaaar-qaada-cai'])
		);
		vi.spyOn(splDerived, 'enabledSplTokenAddresses', 'get').mockReturnValue(
			readable(['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'])
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("saves the shown rows and the hero's total once balances settle", () => {
		render(ExtensionPanelSnapshotSetter, { props: { rows: [{ token: eth }] } });

		vi.advanceTimersByTime(OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS);

		expect(saveExtensionPanelSnapshot).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				savedAt: expect.any(Number),
				usdTotal: 2050,
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				rows: [expect.objectContaining({ symbol: eth.symbol, networkId: 'ETH' })],
				providersUsd: 50
			})
		);
	});

	it('keeps every held token with where its price comes from', () => {
		render(ExtensionPanelSnapshotSetter, { props: { rows: [{ token: eth }] } });

		vi.advanceTimersByTime(OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS);

		const [[snapshot]] = vi.mocked(saveExtensionPanelSnapshot).mock.calls;

		expect(snapshot.holdings).toEqual([
			{ priceKey: 'ethereum', balance: eth.balance, decimals: eth.decimals, usdBalance: 2000 }
		]);
		expect(snapshot.rows[0].holdings).toEqual(snapshot.holdings);
	});

	it("keeps only the held tokens' price lookups", () => {
		render(ExtensionPanelSnapshotSetter, { props: { rows: [{ token: eth }] } });

		vi.advanceTimersByTime(OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS);

		const [[snapshot]] = vi.mocked(saveExtensionPanelSnapshot).mock.calls;

		expect(snapshot.prices).toEqual({ erc20Addresses: [], icrcCanisterIds: [], splAddresses: [] });
	});

	it('saves nothing while balances are still loading', () => {
		vi.spyOn(balancesDerived, 'noPositiveBalanceAndNotAllBalancesZero', 'get').mockReturnValue(
			readable(true)
		);

		render(ExtensionPanelSnapshotSetter, { props: { rows: [{ token: eth }] } });
		vi.advanceTimersByTime(OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS);

		expect(saveExtensionPanelSnapshot).not.toHaveBeenCalled();
	});

	it('saves nothing before the rows are known', () => {
		render(ExtensionPanelSnapshotSetter, { props: { rows: undefined } });
		vi.advanceTimersByTime(OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS);

		expect(saveExtensionPanelSnapshot).not.toHaveBeenCalled();
	});

	it('drops a pending save when it is removed', () => {
		const { unmount } = render(ExtensionPanelSnapshotSetter, {
			props: { rows: [{ token: eth }] }
		});

		unmount();
		vi.advanceTimersByTime(OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS);

		expect(saveExtensionPanelSnapshot).not.toHaveBeenCalled();
	});
});
