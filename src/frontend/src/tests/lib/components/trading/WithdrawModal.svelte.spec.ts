import type { UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import WithdrawModal from '$lib/components/trading/WithdrawModal.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import { modalStore } from '$lib/stores/modal.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
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

const LEDGER_ICP = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
const LEDGER_CKBTC = 'mxzaz-hqaaa-aaaar-qaada-cai';

const buildBalance = ({
	ledgerId,
	free,
	reserved
}: {
	ledgerId: string;
	free: bigint;
	reserved: bigint;
}): UserTokenBalance =>
	({
		token: { id: { ledger_id: Principal.fromText(ledgerId) } },
		balance: { free, reserved }
	}) as unknown as UserTokenBalance;

describe('WithdrawModal', () => {
	const icp: IcToken = {
		...mockValidIcToken,
		id: parseTokenId('WithdrawIcpTokenId'),
		ledgerCanisterId: LEDGER_ICP,
		symbol: 'ICP'
	};

	const ckBtc: IcToken = {
		...mockValidIcToken,
		id: parseTokenId('WithdrawCkBtcTokenId'),
		ledgerCanisterId: LEDGER_CKBTC,
		symbol: 'ckBTC'
	};

	const withdrawToken: OisyTradeWithdrawToken = {
		token: icp,
		free: 5_000_000n,
		reserved: ZERO
	};

	beforeEach(() => {
		oisyTradeStore.reset();
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
	});

	const setDexBalances = () => {
		enabledIcTokensMock.set([icp, ckBtc]);
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: undefined,
			balances: [
				buildBalance({ ledgerId: LEDGER_ICP, free: 5_000_000n, reserved: ZERO }),
				buildBalance({ ledgerId: LEDGER_CKBTC, free: 7_000_000n, reserved: 250_000n })
			],
			orders: undefined
		});
	};

	// The token pill is the only element whose text is exactly the symbol and
	// that sits inside a button (the fee lines render "<amount> <symbol>").
	const getTokenPill = ({
		getAllByText,
		symbol
	}: {
		getAllByText: (text: string) => HTMLElement[];
		symbol: string;
	}) => {
		const pill = getAllByText(symbol).find((element) => element.closest('button') !== null);

		assertNonNullish(pill);

		return pill;
	};

	it('opens on the withdraw form step with the title and amount label', () => {
		const { container } = render(WithdrawModal, {
			props: { withdrawToken }
		});

		expect(container).toHaveTextContent(en.trading.withdraw.title);
		expect(container).toHaveTextContent(en.trading.withdraw.amount_label);
	});

	it('opens directly on the token picker with a close (not back) action when no seed token is given', async () => {
		setDexBalances();

		const closeSpy = vi.spyOn(modalStore, 'close');

		const { getByTestId, getByText, queryByText, container } = render(WithdrawModal);

		await waitFor(() => {
			expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
			expect(container).not.toHaveTextContent(en.trading.withdraw.amount_label);
			// Root entry: nothing precedes the picker, so it offers close, not a back-to-nowhere.
			expect(getByText(en.core.text.close)).toBeInTheDocument();
			expect(queryByText(en.core.text.back)).not.toBeInTheDocument();
		});

		// The picker vanishing alone wouldn't prove a close (the old bug navigated to an
		// empty step, also hiding it), so assert the close action reaches modalStore.
		await fireEvent.click(getByText(en.core.text.close));

		expect(closeSpy).toHaveBeenCalledOnce();
	});

	it('shows the reserved note when the token has reserved funds', () => {
		const { container } = render(WithdrawModal, {
			props: {
				withdrawToken: { ...withdrawToken, reserved: 250_000n }
			}
		});

		expect(container).toHaveTextContent('reserved · locked by open orders');
	});

	it('opens the tokens list with the DEX holdings when the token selector is clicked', async () => {
		setDexBalances();

		const { getAllByText, getByTestId, getByText, queryByText, container } = render(WithdrawModal, {
			props: { withdrawToken }
		});

		await fireEvent.click(getTokenPill({ getAllByText, symbol: 'ICP' }));

		await waitFor(() => {
			expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
			expect(container).toHaveTextContent('ckBTC');
			// Reached from the form (a token is selected), so the picker offers back, not close.
			expect(getByText(en.core.text.back)).toBeInTheDocument();
			expect(queryByText(en.core.text.close)).not.toBeInTheDocument();
		});
	});

	it('switches the withdraw flow to the selected token', async () => {
		setDexBalances();

		const { getAllByText, getByText, container } = render(WithdrawModal, {
			props: { withdrawToken }
		});

		expect(container).not.toHaveTextContent('reserved · locked by open orders');

		await fireEvent.click(getTokenPill({ getAllByText, symbol: 'ICP' }));

		await waitFor(() => expect(getByText('ckBTC')).toBeInTheDocument());

		await fireEvent.click(getByText('ckBTC'));

		// Back on the form, with free/reserved now following the selected token.
		await waitFor(() => {
			expect(container).toHaveTextContent(en.trading.withdraw.amount_label);
			expect(getTokenPill({ getAllByText, symbol: 'ckBTC' })).toBeInTheDocument();
			expect(container).toHaveTextContent('reserved · locked by open orders');
		});
	});
});
