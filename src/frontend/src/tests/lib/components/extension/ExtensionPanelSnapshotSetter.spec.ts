import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import ExtensionPanelSnapshotSetter from '$lib/components/extension/ExtensionPanelSnapshotSetter.svelte';
import { OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS } from '$lib/constants/extension.constants';
import * as balancesDerived from '$lib/derived/balances.derived';
import * as networkTokensUiDerived from '$lib/derived/network-tokens-ui.derived';
import { Currency } from '$lib/enums/currency';
import { saveExtensionPanelSnapshot } from '$lib/services/extension-panel.services';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import type { TokenUi } from '$lib/types/token-ui';
import { toExtensionPanelSnapshotRow } from '$lib/utils/extension.utils';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$lib/services/extension-panel.services', () => ({
	saveExtensionPanelSnapshot: vi.fn()
}));

const eth: TokenUi = { ...ETHEREUM_TOKEN, balance: 1_000_000_000_000_000_000n, usdBalance: 2000 };

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
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("saves the shown rows and the hero's total once balances settle", () => {
		render(ExtensionPanelSnapshotSetter, { props: { rows: [{ token: eth }] } });

		vi.advanceTimersByTime(OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS);

		expect(saveExtensionPanelSnapshot).toHaveBeenCalledExactlyOnceWith({
			savedAt: expect.any(Number),
			usdTotal: 2050,
			currency: Currency.USD,
			exchangeRateToUsd: 1,
			rows: [toExtensionPanelSnapshotRow({ token: eth })]
		});
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
