import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import CyclesTopUpIcpAmount from '$icp/components/cycles-top-up/CyclesTopUpIcpAmount.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON,
	CYCLES_TOP_UP_ESTIMATE,
	CYCLES_TOP_UP_RATE,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { CONVERT_CONTEXT_KEY, initConvertContext } from '$lib/stores/convert.store';
import {
	initTokenActionValidationErrorsContext,
	TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY
} from '$lib/stores/token-action-validation-errors.store';
import type { OptionAmount } from '$lib/types/send';
import { mockXdrPermyriadPerIcp } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('CyclesTopUpIcpAmount', () => {
	const context = () =>
		new Map<symbol, unknown>([
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({ sourceToken: ICP_TOKEN, destinationToken: ICP_TOKEN })
			],
			[TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY, initTokenActionValidationErrorsContext()]
		]);

	// Spread rather than defaulted, so an override can be `undefined`.
	const props = (
		overrides: Partial<{
			sendAmount: OptionAmount;
			xdrPermyriadPerIcp: bigint | undefined;
			rateUnavailable: boolean;
		}> = {}
	) => ({
		sendAmount: '1.5' as OptionAmount,
		xdrPermyriadPerIcp: mockXdrPermyriadPerIcp as bigint | undefined,
		rateUnavailable: false,
		onBack: vi.fn(),
		onNext: vi.fn(),
		...overrides
	});

	const renderAmount = (testProps = props()) =>
		render(CyclesTopUpIcpAmount, { props: testProps, context: context() });

	beforeEach(() => {
		balancesStore.reset(ICP_TOKEN.id);
		balancesStore.set({ id: ICP_TOKEN.id, data: { data: 250_000_000n, certified: true } });
	});

	it('estimates the cycles in trillions, never TCYCLES, with the rate and the fee', () => {
		const { container, getByTestId } = renderAmount();

		// 1.5 ICP at 4.5 XDR per ICP, with no fee taken off the cycles.
		expect(getByTestId(CYCLES_TOP_UP_ESTIMATE)).toHaveTextContent('≈ 6.75T cycles');
		expect(getByTestId(CYCLES_TOP_UP_RATE)).toHaveTextContent('1 ICP ≈ 4.5T cycles');
		expect(container).toHaveTextContent(en.fee.text.network_fee);
		expect(container).not.toHaveTextContent('TCYCLES');
	});

	it('offers the balance minus the network fee as Max', () => {
		const { container } = renderAmount();

		expect(container).toHaveTextContent('Max: 2.4999 ICP');
	});

	it('continues to Review with a valid amount, and goes back', async () => {
		const testProps = props();

		const { getByTestId, getByText } = renderAmount(testProps);

		await fireEvent.click(getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON));

		expect(testProps.onNext).toHaveBeenCalledOnce();

		await fireEvent.click(getByText(en.core.text.back));

		expect(testProps.onBack).toHaveBeenCalledOnce();
	});

	it.each([
		{ label: 'without an amount', sendAmount: undefined },
		{ label: 'with a zero amount', sendAmount: '0' }
	])('cannot continue $label', ({ sendAmount }) => {
		const { getByTestId } = renderAmount(props({ sendAmount }));

		expect(getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeDisabled();
	});

	it('waits for the rate, with the amount disabled', () => {
		const { container, getByTestId } = renderAmount(props({ xdrPermyriadPerIcp: undefined }));

		expect(getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeDisabled();
		expect(
			container.querySelector(`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`)
		).toBeDisabled();
	});

	it('says so when the rate cannot be loaded', () => {
		const { container } = renderAmount(
			props({ xdrPermyriadPerIcp: undefined, rateUnavailable: true })
		);

		expect(container).toHaveTextContent(en.cycles_top_up.error.rate_unavailable);
	});

	// A refund returns the amount minus 0.0003 ICP, so nothing at all.
	it.each(['0.0003', '0.0001'])('cannot continue with %s ICP', (sendAmount) => {
		const { container, getByTestId } = renderAmount(props({ sendAmount }));

		expect(getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeDisabled();
		expect(container).toHaveTextContent(
			'Enter more than 0.0003 ICP: a refund would keep that much in fees.'
		);
	});

	it('continues just above 0.0003 ICP, whatever the rate', () => {
		const { getByTestId } = renderAmount(
			props({ sendAmount: '0.00030001', xdrPermyriadPerIcp: 1n })
		);

		expect(getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeEnabled();
	});

	it('cannot continue when the amount and the fee exceed the balance', async () => {
		balancesStore.set({ id: ICP_TOKEN.id, data: { data: ZERO, certified: true } });

		const { container, getByTestId } = renderAmount();

		await waitFor(() => {
			expect(getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeDisabled();
			expect(container).toHaveTextContent(en.send.assertion.insufficient_funds);
		});

		expect(container).toHaveTextContent('Max: 0 ICP');
	});

	it('cannot continue with the whole balance, which leaves nothing for the fee', () => {
		const { getByTestId } = renderAmount(props({ sendAmount: '2.5' }));

		expect(getByTestId(CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON)).toBeDisabled();
	});
});
