import WithdrawReview from '$lib/components/trading/WithdrawReview.svelte';
import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
import { TRADING_WITHDRAW_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('WithdrawReview', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: mockValidIcToken })]
		]);

	const baseProps = {
		amount: 0.01,
		transferFee: mockValidIcToken.fee,
		onBack: () => {},
		onConfirm: () => {}
	};

	it('renders the provider, network, fees and the submit button', () => {
		const { container, getByTestId } = render(WithdrawReview, {
			props: baseProps,
			context: mockContext()
		});

		expect(container).toHaveTextContent(OISY_TRADE_PROVIDER_NAME);
		expect(container).toHaveTextContent(en.trading.withdraw.network);
		expect(container).toHaveTextContent(en.trading.withdraw.from);
		expect(container).toHaveTextContent(en.trading.withdraw.transfer_fee);
		expect(container).toHaveTextContent(en.trading.withdraw.you_receive);
		expect(container).toHaveTextContent(mockValidIcToken.network.name);
		expect(getByTestId(TRADING_WITHDRAW_REVIEW_BUTTON)).toHaveTextContent(
			en.trading.withdraw.submit
		);
	});

	it('renders the OISY Trade logo next to the provider name', () => {
		const { getByLabelText } = render(WithdrawReview, {
			props: baseProps,
			context: mockContext()
		});

		expect(getByLabelText('OISY Trade')).toBeInTheDocument();
	});

	it('calls onBack when the back button is clicked', async () => {
		const onBack = vi.fn();

		const { getByText } = render(WithdrawReview, {
			props: { ...baseProps, onBack },
			context: mockContext()
		});

		await fireEvent.click(getByText(en.core.text.back));

		expect(onBack).toHaveBeenCalledOnce();
	});

	it('calls onConfirm when the submit button is clicked', async () => {
		const onConfirm = vi.fn();

		const { getByTestId } = render(WithdrawReview, {
			props: { ...baseProps, onConfirm },
			context: mockContext()
		});

		await fireEvent.click(getByTestId(TRADING_WITHDRAW_REVIEW_BUTTON));

		expect(onConfirm).toHaveBeenCalledOnce();
	});
});
