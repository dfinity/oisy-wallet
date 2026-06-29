import type {
	Token as OisyTradeToken,
	TradingPairInfo
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingDepositModal from '$lib/components/trading/TradingDepositModal.svelte';
import {
	TRADING_DEPOSIT_CONSENT_CHECKBOX,
	TRADING_DEPOSIT_FORM_REVIEW_BUTTON,
	TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON
} from '$lib/constants/test-ids.constants';
import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
import { balancesStore } from '$lib/stores/balances.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

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

const depositOisyTradeMock = vi.fn();

vi.mock('$lib/services/oisy-trade.deposit.services', () => ({
	depositOisyTrade: (params: { progress: (step: string) => void }) => depositOisyTradeMock(params)
}));

const LEDGER_ICP = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

const supportedToken = (): OisyTradeToken =>
	({
		id: { ledger_id: Principal.fromText(LEDGER_ICP) },
		metadata: { symbol: 'ICP', decimals: 8 }
	}) as unknown as OisyTradeToken;

const buildPair = ({ base, quote }: { base: string; quote: string }): TradingPairInfo =>
	({
		base: { metadata: { symbol: base } },
		quote: { metadata: { symbol: quote } }
	}) as unknown as TradingPairInfo;

describe('TradingDepositModal', () => {
	const icp: IcToken = {
		...mockValidIcToken,
		ledgerCanisterId: LEDGER_ICP,
		symbol: 'ICP',
		decimals: 8,
		fee: 10000n
	};

	beforeEach(() => {
		oisyTradeStore.reset();
		balancesStore.reset(icp.id);
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
		depositOisyTradeMock.mockReset();
	});

	it('should render the empty state when there is nothing to deposit', () => {
		const { getByText } = render(TradingDepositModal);

		expect(getByText(en.trading.deposit.empty_title)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.empty_description)).toBeInTheDocument();
	});

	it('should render the supported token symbols as chips in the empty state', () => {
		oisyTradeStore.set({
			pairs: [
				buildPair({ base: 'ICP', quote: 'ckUSDC' }),
				buildPair({ base: 'ckBTC', quote: 'ckUSDC' })
			],
			supportedTokens: undefined,
			balances: undefined
		});

		const { getByText } = render(TradingDepositModal);

		expect(getByText(en.trading.deposit.empty_title)).toBeInTheDocument();
		expect(getByText('ICP')).toBeInTheDocument();
		expect(getByText('ckUSDC')).toBeInTheDocument();
		expect(getByText('ckBTC')).toBeInTheDocument();
	});

	const seedDepositable = () => {
		enabledIcTokensMock.set([icp]);
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: [supportedToken()],
			balances: undefined
		});
		balancesStore.set({ id: icp.id, data: { data: 100000000n, certified: true } });
	};

	it('should render the deposit form when there is a depositable token', () => {
		seedDepositable();

		const { getByText } = render(TradingDepositModal);

		expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.consent)).toBeInTheDocument();
	});

	it('should navigate to the tokens list and back via the token selector', async () => {
		seedDepositable();

		const { getByPlaceholderText, getByText, queryByPlaceholderText } = render(TradingDepositModal);

		await fireEvent.click(getByText(en.tokens.text.select_token));

		await waitFor(() =>
			expect(getByPlaceholderText(en.tokens.placeholder.search_token)).toBeInTheDocument()
		);

		await fireEvent.click(getByText(en.core.text.back));

		await waitFor(() => {
			expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
			expect(queryByPlaceholderText(en.tokens.placeholder.search_token)).not.toBeInTheDocument();
		});
	});

	it('should select a token from the list and return to the deposit form', async () => {
		seedDepositable();

		const { getAllByText, getByPlaceholderText, getByText, queryByText } =
			render(TradingDepositModal);

		await fireEvent.click(getByText(en.tokens.text.select_token));

		await waitFor(() =>
			expect(getByPlaceholderText(en.tokens.placeholder.search_token)).toBeInTheDocument()
		);

		const [tokenButton] = getAllByText(icp.symbol);
		await fireEvent.click(tokenButton);

		await waitFor(() => {
			expect(queryByText(en.tokens.text.select_token)).not.toBeInTheDocument();
			expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
		});
	});

	it('should drive the form through review and trigger the deposit', async () => {
		seedDepositable();
		depositOisyTradeMock.mockImplementation(({ progress }) => {
			progress(ProgressStepsTradingDeposit.DONE);
			return Promise.resolve();
		});

		const { getAllByText, getByPlaceholderText, getByTestId, getByText } =
			render(TradingDepositModal);

		// Pick a token first — the wizard opens with none selected.
		await fireEvent.click(getByText(en.tokens.text.select_token));
		await waitFor(() =>
			expect(getByPlaceholderText(en.tokens.placeholder.search_token)).toBeInTheDocument()
		);
		const [tokenButton] = getAllByText(icp.symbol);
		await fireEvent.click(tokenButton);
		await waitFor(() =>
			expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeInTheDocument()
		);

		await fireEvent.click(getByTestId(TRADING_DEPOSIT_CONSENT_CHECKBOX));

		const amountInput = document.querySelector<HTMLInputElement>('input[name="token-input"]');

		expect(amountInput).not.toBeNull();

		await fireEvent.input(amountInput as HTMLInputElement, { target: { value: '1' } });

		await waitFor(() => expect(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON)).toBeEnabled());
		await fireEvent.click(getByTestId(TRADING_DEPOSIT_FORM_REVIEW_BUTTON));

		await waitFor(() =>
			expect(getByTestId(TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON)).toBeInTheDocument()
		);
		await fireEvent.click(getByTestId(TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON));

		await waitFor(() => expect(depositOisyTradeMock).toHaveBeenCalledOnce());
	});
});
