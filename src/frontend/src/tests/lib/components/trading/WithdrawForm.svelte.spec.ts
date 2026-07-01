import WithdrawForm from '$lib/components/trading/WithdrawForm.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
import { MAX_BUTTON, TRADING_WITHDRAW_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getMaxTransactionAmount } from '$lib/utils/token.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('WithdrawForm', () => {
	const free = 5_000_000n;

	const mockContext = (customSendBalance = free) =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: mockValidIcToken, customSendBalance })]
		]);

	const baseProps = {
		amount: undefined,
		amountSetToMax: false,
		reserved: ZERO,
		transferFee: mockValidIcToken.fee,
		onClose: () => {},
		onNext: () => {}
	};

	it('renders the amount label, provider, fees and the gross "You receive" net', () => {
		const { container } = render(WithdrawForm, {
			props: baseProps,
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.trading.withdraw.amount_label);
		expect(container).toHaveTextContent(OISY_TRADE_PROVIDER_NAME);
		expect(container).toHaveTextContent(en.trading.withdraw.transfer_fee);
		expect(container).toHaveTextContent(en.trading.withdraw.you_receive);
	});

	it('disables the review button while the amount is invalid', () => {
		const { getByTestId } = render(WithdrawForm, {
			props: baseProps,
			context: mockContext()
		});

		expect(getByTestId(TRADING_WITHDRAW_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('enables the review button for a valid positive amount', () => {
		const { getByTestId } = render(WithdrawForm, {
			props: { ...baseProps, amount: 1 },
			context: mockContext()
		});

		expect(getByTestId(TRADING_WITHDRAW_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('shows the reserved note when funds are locked by open orders', () => {
		const reserved = 250_000n;

		const { container } = render(WithdrawForm, {
			props: { ...baseProps, reserved },
			context: mockContext()
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.trading.withdraw.reserved_note, {
				$amount: `${formatToken({ value: reserved, unitName: mockValidIcToken.decimals })} ${mockValidIcToken.symbol}`
			})
		);
	});

	it('hides the reserved note when nothing is reserved', () => {
		const { container } = render(WithdrawForm, {
			props: baseProps,
			context: mockContext()
		});

		expect(container).not.toHaveTextContent('reserved · locked by open orders');
	});

	it('sets the amount to the full free balance on Max (no fee subtracted)', async () => {
		const testProps = $state({ ...baseProps });

		const { getByTestId } = render(WithdrawForm, {
			props: testProps,
			context: mockContext()
		});

		await fireEvent.click(getByTestId(MAX_BUTTON));

		// Max is the FULL free balance — the ledger fee is taken out of the gross
		// amount, not added on top, so Max does not subtract it.
		expect(testProps.amount).toBe(
			getMaxTransactionAmount({
				balance: free,
				fee: ZERO,
				tokenDecimals: mockValidIcToken.decimals,
				tokenStandard: mockValidIcToken.standard
			})
		);
		expect(testProps.amountSetToMax).toBeTruthy();
	});

	it('calls onNext when the review button is clicked', async () => {
		const onNext = vi.fn();

		const { getByTestId } = render(WithdrawForm, {
			props: { ...baseProps, amount: 1, onNext },
			context: mockContext()
		});

		await fireEvent.click(getByTestId(TRADING_WITHDRAW_FORM_REVIEW_BUTTON));

		expect(onNext).toHaveBeenCalledOnce();
	});
});
