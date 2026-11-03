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

	describe('withApproveStep', () => {
		// The row's own state, not merely its presence: the bug this flag fixes was a
		// step driven into a list that did not render it, which matches nothing and
		// leaves every row unhighlighted until the next step that does exist.
		const inProgressText = (container: HTMLElement): string | undefined =>
			container.querySelector('.step.in_progress .text')?.textContent?.trim();

		it('renders the approve step without either signing step', () => {
			const { container } = render(SwapProgress, {
				props: { withApproveStep: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.approving);
			expect(container).not.toHaveTextContent(baseStepTexts.signingApproval);
			expect(container).not.toHaveTextContent(baseStepTexts.signingTransaction);
		});

		it('still renders base steps', () => {
			const { container } = render(SwapProgress, {
				props: { withApproveStep: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.initializing);
			expect(container).toHaveTextContent(baseStepTexts.swapping);
			expect(container).toHaveTextContent(baseStepTexts.refreshingUi);
		});

		it('highlights the approve step it renders', () => {
			const { container } = render(SwapProgress, {
				props: { withApproveStep: true, swapProgressStep: ProgressStepsSwap.APPROVE }
			});

			expect(inProgressText(container)).toBe(baseStepTexts.approving);
		});

		// The regression. Without the flag the approve step exists nowhere in the list,
		// so the whole progress list renders unhighlighted — which is what a user saw as
		// an empty list for as long as the approve leg took.
		it('leaves every row unhighlighted on the approve step without the flag', () => {
			const { container } = render(SwapProgress, {
				props: { swapProgressStep: ProgressStepsSwap.APPROVE }
			});

			expect(container.querySelector('.step.in_progress')).toBeNull();
		});

		// Two rows sharing one step id would break the in-progress lookup, which matches
		// by id, so the two props contribute the one row between them.
		it('adds no second approve row when sendWithApproval already contributes one', () => {
			const { container } = render(SwapProgress, {
				props: { sendWithApproval: true, withApproveStep: true }
			});

			expect(
				[...container.querySelectorAll('.step .text')].filter(
					(el) => el.textContent?.trim() === baseStepTexts.approving
				)
			).toHaveLength(1);
			expect(container).toHaveTextContent(baseStepTexts.signingApproval);
		});
	});

	describe('swapWithActiveTransaction', () => {
		it('replaces the swapping and refreshing copy with the background-settlement copy', () => {
			const { container } = render(SwapProgress, {
				props: { swapWithActiveTransaction: true }
			});

			expect(container).toHaveTextContent(en.swap.text.starting_to_swap);
			expect(container).toHaveTextContent(en.swap.text.finishing_in_background);
			expect(container).not.toHaveTextContent(baseStepTexts.swapping);
			expect(container).not.toHaveTextContent(baseStepTexts.refreshingUi);
		});

		it('uses the bridging copy only when the background phase is a bridge', () => {
			const { container } = render(SwapProgress, {
				props: { swapWithActiveTransaction: true, swapWithBridging: true }
			});

			expect(container).toHaveTextContent(en.swap.text.starting_to_bridge);
			expect(container).not.toHaveTextContent(en.swap.text.finishing_in_background);
		});

		it('ignores swapWithBridging when the swap is not tracked in the background', () => {
			const { container } = render(SwapProgress, {
				props: { swapWithBridging: true }
			});

			expect(container).toHaveTextContent(baseStepTexts.refreshingUi);
			expect(container).not.toHaveTextContent(en.swap.text.starting_to_bridge);
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
