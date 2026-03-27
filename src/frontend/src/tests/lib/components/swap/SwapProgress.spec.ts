import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SwapProgress', () => {
	const baseStepTexts = {
		initializing: en.swap.text.initializing,
		signingApproval: en.send.text.signing_approval,
		approving: en.send.text.approving,
		signingTransaction: en.send.text.signing_transaction,
		swapping: en.swap.text.swapping,
		withdrawing: en.swap.text.withdrawing,
		refreshingUi: en.swap.text.refreshing_ui
	};

	describe('default steps (no optional props)', () => {
		it('renders initialization, swapping, and refreshing steps', () => {
			const { container } = render(SwapProgress);

			expect(container).toHaveTextContent(baseStepTexts.initializing);
			expect(container).toHaveTextContent(baseStepTexts.swapping);
			expect(container).toHaveTextContent(baseStepTexts.refreshingUi);
		});

		it('does not render approval steps', () => {
			const { container } = render(SwapProgress);

			expect(container).not.toHaveTextContent(baseStepTexts.signingApproval);
			expect(container).not.toHaveTextContent(baseStepTexts.approving);
		});

		it('does not render signing transaction step', () => {
			const { container } = render(SwapProgress);

			expect(container).not.toHaveTextContent(baseStepTexts.signingTransaction);
		});

		it('does not render withdraw step', () => {
			const { container } = render(SwapProgress);

			expect(container).not.toHaveTextContent(baseStepTexts.withdrawing);
		});
	});

	describe('sendWithApproval', () => {
		it('renders approval and signing transaction steps', () => {
			const { container } = render(SwapProgress, {
				props: { sendWithApproval: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.signingApproval);
			expect(container).toHaveTextContent(baseStepTexts.approving);
			expect(container).toHaveTextContent(baseStepTexts.signingTransaction);
		});

		it('still renders base steps', () => {
			const { container } = render(SwapProgress, {
				props: { sendWithApproval: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.initializing);
			expect(container).toHaveTextContent(baseStepTexts.swapping);
			expect(container).toHaveTextContent(baseStepTexts.refreshingUi);
		});
	});

	describe('sendWithTransfer', () => {
		it('renders signing transaction step', () => {
			const { container } = render(SwapProgress, {
				props: { sendWithTransfer: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.signingTransaction);
		});

		it('does not render approval steps', () => {
			const { container } = render(SwapProgress, {
				props: { sendWithTransfer: true }
			});

			expect(container).not.toHaveTextContent(baseStepTexts.signingApproval);
			expect(container).not.toHaveTextContent(baseStepTexts.approving);
		});

		it('still renders base steps', () => {
			const { container } = render(SwapProgress, {
				props: { sendWithTransfer: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.initializing);
			expect(container).toHaveTextContent(baseStepTexts.swapping);
			expect(container).toHaveTextContent(baseStepTexts.refreshingUi);
		});
	});

	describe('sendWithApproval and sendWithTransfer combined', () => {
		it('renders all approval and signing steps without duplication', () => {
			const { container } = render(SwapProgress, {
				props: { sendWithApproval: true, sendWithTransfer: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.signingApproval);
			expect(container).toHaveTextContent(baseStepTexts.approving);
			expect(container).toHaveTextContent(baseStepTexts.signingTransaction);
		});
	});

	describe('swapWithWithdrawing', () => {
		it('renders withdraw step', () => {
			const { container } = render(SwapProgress, {
				props: { swapWithWithdrawing: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.withdrawing);
		});

		it('still renders base steps', () => {
			const { container } = render(SwapProgress, {
				props: { swapWithWithdrawing: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.initializing);
			expect(container).toHaveTextContent(baseStepTexts.swapping);
			expect(container).toHaveTextContent(baseStepTexts.refreshingUi);
		});
	});

	describe('progress step highlighting', () => {
		it('renders with INITIALIZATION step by default', () => {
			const { container } = render(SwapProgress);

			expect(container).toHaveTextContent(baseStepTexts.initializing);
		});

		it('renders with a custom progress step', () => {
			const { container } = render(SwapProgress, {
				props: { swapProgressStep: ProgressStepsSwap.SWAP }
			});

			expect(container).toHaveTextContent(baseStepTexts.swapping);
		});
	});

	describe('all optional steps enabled', () => {
		it('renders all possible steps', () => {
			const { container } = render(SwapProgress, {
				props: {
					sendWithApproval: true,
					sendWithTransfer: true,
					swapWithWithdrawing: true
				}
			});

			expect(container).toHaveTextContent(baseStepTexts.initializing);
			expect(container).toHaveTextContent(baseStepTexts.signingApproval);
			expect(container).toHaveTextContent(baseStepTexts.approving);
			expect(container).toHaveTextContent(baseStepTexts.signingTransaction);
			expect(container).toHaveTextContent(baseStepTexts.swapping);
			expect(container).toHaveTextContent(baseStepTexts.withdrawing);
			expect(container).toHaveTextContent(baseStepTexts.refreshingUi);
		});
	});
});
