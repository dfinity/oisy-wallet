import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import CyclesMintForm from '$icp/components/cycles-mint/CyclesMintForm.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	CYCLES_MINT_FORM_REVIEW_BUTTON,
	CYCLES_MINT_RATE,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { CONVERT_CONTEXT_KEY, initConvertContext } from '$lib/stores/convert.store';
import {
	initTokenActionValidationErrorsContext,
	TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY
} from '$lib/stores/token-action-validation-errors.store';
import type { OptionAmount } from '$lib/types/send';
import { mockTcyclesToken, mockXdrPermyriadPerIcp } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('CyclesMintForm', () => {
	const context = () =>
		new Map<symbol, unknown>([
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({ sourceToken: ICP_TOKEN, destinationToken: mockTcyclesToken })
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
		onCancel: vi.fn(),
		onNext: vi.fn(),
		...overrides
	});

	const inputs = (container: HTMLElement): HTMLInputElement[] => [
		...container.querySelectorAll<HTMLInputElement>(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		)
	];

	beforeEach(() => {
		balancesStore.reset(ICP_TOKEN.id);
		balancesStore.set({ id: ICP_TOKEN.id, data: { data: 250_000_000n, certified: true } });
	});

	it('explains the mint, estimates it and shows the rate, the fees and the one-way notice', () => {
		const { container, getByTestId } = render(CyclesMintForm, {
			props: props(),
			context: context()
		});

		expect(container).toHaveTextContent(
			"Minting creates new TCYCLES from ICP at the network's rate, and burns the ICP."
		);
		expect(container).toHaveTextContent(en.cycles_mint.text.you_mint_estimate);
		// 1.5 ICP × 4.5 TCYCLES − the 0.0001 TCYCLES deposit fee.
		expect(inputs(container)[1].value).toBe('6.7499');
		expect(getByTestId(CYCLES_MINT_RATE)).toHaveTextContent('1 ICP ≈ 4.5 TCYCLES');
		expect(container).toHaveTextContent(en.cycles_mint.text.cycles_ledger_fee);
		expect(container).toHaveTextContent(
			'Minting cannot be undone: TCYCLES cannot be turned back into ICP.'
		);
	});

	it('offers the balance minus the network fee as Max', () => {
		const { container } = render(CyclesMintForm, { props: props(), context: context() });

		expect(container).toHaveTextContent('Max: 2.4999 ICP');
	});

	it('continues to Review with a valid amount', async () => {
		const testProps = props();

		const { getByTestId } = render(CyclesMintForm, { props: testProps, context: context() });

		const button = getByTestId(CYCLES_MINT_FORM_REVIEW_BUTTON);

		expect(button).not.toBeDisabled();

		await fireEvent.click(button);

		expect(testProps.onNext).toHaveBeenCalledOnce();
	});

	it('cancels', async () => {
		const testProps = props();

		const { getByText } = render(CyclesMintForm, { props: testProps, context: context() });

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(testProps.onCancel).toHaveBeenCalledOnce();
	});

	it.each([
		{ label: 'without an amount', sendAmount: undefined },
		{ label: 'with a zero amount', sendAmount: '0' }
	])('cannot continue $label', ({ sendAmount }) => {
		const { getByTestId } = render(CyclesMintForm, {
			props: props({ sendAmount }),
			context: context()
		});

		expect(getByTestId(CYCLES_MINT_FORM_REVIEW_BUTTON)).toBeDisabled();
	});

	it('waits for the rate, with the amount disabled', () => {
		const { container, getByTestId } = render(CyclesMintForm, {
			props: props({ xdrPermyriadPerIcp: undefined }),
			context: context()
		});

		expect(getByTestId(CYCLES_MINT_FORM_REVIEW_BUTTON)).toBeDisabled();
		expect(inputs(container)[0]).toBeDisabled();
	});

	it('says so when the rate cannot be loaded', () => {
		const { container } = render(CyclesMintForm, {
			props: props({ xdrPermyriadPerIcp: undefined, rateUnavailable: true }),
			context: context()
		});

		expect(container).toHaveTextContent(
			'The TCYCLES rate could not be loaded. Please try again later.'
		);
	});

	// Such an amount is refunded minus fees larger than itself.
	it('cannot continue when the estimate would not clear the deposit fee with a margin', () => {
		const { container, getByTestId } = render(CyclesMintForm, {
			props: props({ sendAmount: '0.000001' }),
			context: context()
		});

		expect(getByTestId(CYCLES_MINT_FORM_REVIEW_BUTTON)).toBeDisabled();
		expect(container).toHaveTextContent('The amount is too small to mint TCYCLES.');
	});

	it('cannot continue when the amount and the fee exceed the balance', async () => {
		balancesStore.set({ id: ICP_TOKEN.id, data: { data: ZERO, certified: true } });

		const { container, getByTestId } = render(CyclesMintForm, {
			props: props(),
			context: context()
		});

		await waitFor(() => {
			expect(getByTestId(CYCLES_MINT_FORM_REVIEW_BUTTON)).toBeDisabled();
			expect(container).toHaveTextContent(en.send.assertion.insufficient_funds);
		});

		expect(container).toHaveTextContent('Max: 0 ICP');
	});
});
