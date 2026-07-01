import type { UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingAssets from '$lib/components/trading/TradingAssets.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { TRADING_ASSETS_DEPOSIT_BUTTON } from '$lib/constants/test-ids.constants';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { fireEvent, render } from '@testing-library/svelte';

const { enabledIcTokensMock, exchangesMock } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return {
		enabledIcTokensMock: createWritable([]),
		exchangesMock: createWritable({})
	};
});

vi.mock(import('$lib/derived/tokens.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get enabledIcTokens() {
		return enabledIcTokensMock;
	}
}));

vi.mock(import('$lib/derived/exchange.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get exchanges() {
		return exchangesMock;
	}
}));

const LEDGER_ICP = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

const buildBalance = ({ free, reserved }: { free: bigint; reserved: bigint }): UserTokenBalance =>
	({
		token: { id: { ledger_id: Principal.fromText(LEDGER_ICP) } },
		balance: { free, reserved }
	}) as unknown as UserTokenBalance;

describe('TradingAssets', () => {
	const icp: IcToken = {
		...mockValidIcToken,
		ledgerCanisterId: LEDGER_ICP,
		symbol: 'ICP',
		decimals: 8
	};

	beforeEach(() => {
		oisyTradeStore.reset();
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
		setPrivacyMode({ enabled: false });
	});

	it('should render the title and the empty state when there are no assets', () => {
		const { getByText } = render(TradingAssets, { props: { onDeposit: () => {} } });

		expect(getByText(en.trading.assets.title)).toBeInTheDocument();
		expect(getByText(en.trading.assets.empty)).toBeInTheDocument();
	});

	it('should render a row per resolved asset when balances are present', () => {
		enabledIcTokensMock.set([icp]);
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: undefined,
			balances: [buildBalance({ free: 100000000n, reserved: ZERO })],
			orders: undefined
		});

		const { queryByText, getAllByText } = render(TradingAssets, {
			props: { onDeposit: () => {} }
		});

		expect(queryByText(en.trading.assets.empty)).toBeNull();
		expect(getAllByText('ICP').length).toBeGreaterThan(0);
	});

	it('should call onDeposit when the deposit button is clicked', async () => {
		const onDeposit = vi.fn();

		const { getByTestId } = render(TradingAssets, { props: { onDeposit } });

		await fireEvent.click(getByTestId(TRADING_ASSETS_DEPOSIT_BUTTON));

		expect(onDeposit).toHaveBeenCalledOnce();
	});
});
