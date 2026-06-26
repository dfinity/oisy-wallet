import WithdrawWizard from '$lib/components/trading/WithdrawWizard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
import { WizardStepsTradingWithdraw } from '$lib/enums/wizard-steps';
import * as oisyTradeServices from '$lib/services/oisy-trade.services';
import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import type { WizardStep } from '@dfinity/gix-components';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('WithdrawWizard', () => {
	const context = () =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: mockValidIcToken })]
		]);

	const step = (name: WizardStepsTradingWithdraw): WizardStep => ({ name, title: name });

	const baseProps = {
		token: mockValidIcToken,
		amount: 0.01,
		amountSetToMax: false,
		reserved: ZERO,
		withdrawProgressStep: ProgressStepsTradingWithdraw.INITIALIZATION,
		onClose: () => {},
		onNext: () => {},
		onBack: () => {}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthStore();
	});

	it('renders the form step by default', () => {
		const { container } = render(WithdrawWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsTradingWithdraw.WITHDRAW) },
			context: context()
		});

		expect(container).toHaveTextContent(en.trading.withdraw.amount_label);
	});

	it('renders the review step', () => {
		const { container } = render(WithdrawWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsTradingWithdraw.REVIEW) },
			context: context()
		});

		expect(container).toHaveTextContent(en.trading.withdraw.submit);
	});

	it('renders the progress step', () => {
		const { container } = render(WithdrawWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsTradingWithdraw.WITHDRAWING) },
			context: context()
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
	});

	it('withdraws and marks the flow done on confirm', async () => {
		const onNext = vi.fn();
		const withdrawSpy = vi
			.spyOn(oisyTradeServices, 'withdrawFromOisyTrade')
			.mockResolvedValue(undefined);

		const testProps = $state({
			...baseProps,
			onNext,
			currentStep: step(WizardStepsTradingWithdraw.REVIEW)
		});

		const { getByText } = render(WithdrawWizard, {
			props: testProps,
			context: context()
		});

		await fireEvent.click(getByText(en.trading.withdraw.submit));

		await waitFor(() => {
			expect(withdrawSpy).toHaveBeenCalledOnce();
			expect(onNext).toHaveBeenCalledOnce();
			expect(testProps.withdrawProgressStep).toBe(ProgressStepsTradingWithdraw.DONE);
		});
	});

	it('surfaces an error toast and steps back when the withdrawal fails', async () => {
		const onBack = vi.fn();
		const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');
		vi.spyOn(oisyTradeServices, 'withdrawFromOisyTrade').mockRejectedValue(new Error('boom'));

		const { getByText } = render(WithdrawWizard, {
			props: { ...baseProps, onBack, currentStep: step(WizardStepsTradingWithdraw.REVIEW) },
			context: context()
		});

		await fireEvent.click(getByText(en.trading.withdraw.submit));

		await waitFor(() => {
			expect(toastsErrorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.trading.withdraw.error } })
			);
			expect(onBack).toHaveBeenCalledOnce();
		});
	});

	it('shows an error and skips the withdrawal when the amount is missing', async () => {
		const onNext = vi.fn();
		const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');
		const withdrawSpy = vi.spyOn(oisyTradeServices, 'withdrawFromOisyTrade');

		const { getByText } = render(WithdrawWizard, {
			props: {
				...baseProps,
				amount: undefined,
				onNext,
				currentStep: step(WizardStepsTradingWithdraw.REVIEW)
			},
			context: context()
		});

		await fireEvent.click(getByText(en.trading.withdraw.submit));

		await waitFor(() => {
			expect(toastsErrorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.send.assertion.amount_invalid } })
			);
		});

		expect(withdrawSpy).not.toHaveBeenCalled();
		expect(onNext).not.toHaveBeenCalled();
	});
});
