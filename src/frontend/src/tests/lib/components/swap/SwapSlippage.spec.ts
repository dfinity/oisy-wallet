import SwapSlippage from '$lib/components/swap/SwapSlippage.svelte';
import {
	SWAP_SLIPPAGE_INVALID_VALUE,
	SWAP_SLIPPAGE_VELORA_INVALID_VALUE
} from '$lib/constants/swap.constants';
import { screensStore } from '$lib/stores/screens.store';
import type { OptionAmount } from '$lib/types/send';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';

describe('SwapSlippage', () => {
	// Spread rather than destructured defaults, so an explicit `slippageValue: undefined` stays undefined.
	const renderSlippage = (
		overrides: { slippageValue?: OptionAmount; maxSlippageInvalidValue?: number } = {}
	) => {
		const result = render(SwapSlippage, {
			props: {
				slippageValue: '1.5',
				maxSlippageInvalidValue: SWAP_SLIPPAGE_VELORA_INVALID_VALUE,
				...overrides
			}
		});

		return {
			...result,
			trigger: result.getByRole('button', { name: en.swap.text.max_slippage })
		};
	};

	beforeEach(() => {
		screensStore.set('lg');
	});

	describe('trigger', () => {
		it('should show the value in the brand tint, beside the settings icon', () => {
			const { trigger } = renderSlippage();

			expect(trigger).toHaveTextContent(/^1\.5%$/);
			expect(trigger).toHaveClass('bg-brand-subtle-20', 'text-brand-primary');
			expect(trigger.querySelectorAll('svg')).toHaveLength(1);
		});

		it.each([
			{ slippageValue: '12.3456', label: '12.34%' },
			{ slippageValue: '49.996', label: '49.99%' },
			{ slippageValue: '0.004', label: '0.004%' }
		])('should show $slippageValue as $label', ({ slippageValue, label }) => {
			const { trigger } = renderSlippage({
				slippageValue,
				maxSlippageInvalidValue: SWAP_SLIPPAGE_INVALID_VALUE
			});

			expect(trigger).toHaveTextContent(label);
		});

		// The pill shows the value and a settings icon only, so the label lives in its name.
		it('should be named by its aria-label, without a visible label', () => {
			const { trigger } = renderSlippage();

			expect(trigger).toHaveAttribute('aria-label', en.swap.text.max_slippage);
			expect(within(trigger).queryByText(en.swap.text.max_slippage)).not.toBeInTheDocument();
		});

		it('should announce the editor it opens', () => {
			const { trigger } = renderSlippage();

			expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});

		// The tint alone marks the state: an icon would push the modal title off centre at 320 px.
		it('should mark a high slippage with the warning tint alone', () => {
			const { trigger } = renderSlippage({ slippageValue: '8' });

			expect(trigger).toHaveTextContent(/^8%$/);
			expect(trigger).toHaveClass('bg-warning-subtle-10', 'text-warning-primary');
			expect(trigger.querySelectorAll('svg')).toHaveLength(1);
		});

		it.each([
			{ slippageValue: '15', label: '15%' },
			{ slippageValue: '0', label: '0%' },
			{ slippageValue: undefined, label: '0%' }
		])(
			'should mark $slippageValue as refused with the error tint alone',
			({ slippageValue, label }) => {
				const { trigger } = renderSlippage({ slippageValue });

				expect(trigger).toHaveTextContent(label);
				expect(trigger).toHaveClass('bg-error-subtle-10', 'text-error-primary');
				expect(trigger.querySelectorAll('svg')).toHaveLength(1);
			}
		);

		it('should accept up to the limit it is given', () => {
			const { trigger } = renderSlippage({
				slippageValue: '15',
				maxSlippageInvalidValue: SWAP_SLIPPAGE_INVALID_VALUE
			});

			expect(trigger).toHaveClass('bg-warning-subtle-10');
		});
	});

	// On Review the quote being confirmed carries this slippage: the pill only shows it.
	describe('read-only', () => {
		const renderReadonly = (slippageValue: OptionAmount) =>
			render(SwapSlippage, {
				props: {
					slippageValue,
					maxSlippageInvalidValue: SWAP_SLIPPAGE_VELORA_INVALID_VALUE,
					readonly: true
				}
			});

		it('should show the value without a button or settings icon', () => {
			const { container, queryByRole } = renderReadonly('1.5');

			expect(queryByRole('button')).not.toBeInTheDocument();
			expect(container.querySelector('svg')).toBeNull();
			expect(container).toHaveTextContent('1.5%');
		});

		it('should name the value for screen readers', () => {
			const { getByText } = renderReadonly('1.5');

			expect(getByText(en.swap.text.max_slippage)).toHaveClass('sr-only');
		});

		// Beside the longer Review title it would cut it on phones, where Review lists it instead.
		it('should not render on phones', () => {
			screensStore.set('sm');

			const { container } = renderReadonly('1.5');

			expect(container).not.toHaveTextContent('1.5%');
		});

		it('should render from 640 px up', () => {
			screensStore.set('md');

			const { container } = renderReadonly('1.5');

			expect(container).toHaveTextContent('1.5%');
		});

		it('should keep the tint, without a hover', () => {
			const { getByText } = renderReadonly('8');

			const pill = getByText(en.swap.text.max_slippage).parentElement;

			expect(pill).toHaveClass('bg-warning-subtle-10', 'text-warning-primary');
			expect(pill?.className).not.toContain('hover:');
		});
	});

	describe('editor', () => {
		it('should open in a popover from md', async () => {
			const { trigger, getByTestId, queryByTestId } = renderSlippage();

			await fireEvent.click(trigger);

			await waitFor(() => expect(getByTestId('popover-content')).toBeInTheDocument());

			expect(queryByTestId('bottom-sheet')).not.toBeInTheDocument();
			expect(trigger).toHaveAttribute('aria-expanded', 'true');
		});

		it('should open in a bottom sheet on phones', async () => {
			screensStore.set('xs');

			const { trigger, getByTestId, queryByTestId } = renderSlippage();

			await fireEvent.click(trigger);

			await waitFor(() => expect(getByTestId('bottom-sheet')).toBeInTheDocument());

			expect(queryByTestId('popover-content')).not.toBeInTheDocument();
		});

		it('should hold the input, the presets and the limit', async () => {
			const { trigger, getByTestId } = renderSlippage();

			await fireEvent.click(trigger);

			const editor = await waitFor(() => getByTestId('popover-content'));

			expect(editor.querySelector('input[name="swap-slippage"]')).toBeInTheDocument();
			expect(within(editor).getByRole('button', { name: '0.5%' })).toBeInTheDocument();
			expect(within(editor).getByRole('button', { name: '1.5%' })).toBeInTheDocument();
			expect(within(editor).getByRole('button', { name: '3%' })).toBeInTheDocument();
			expect(
				within(editor).getByText(
					replacePlaceholders(en.swap.text.max_slippage_info, {
						$maxSlippage: `${SWAP_SLIPPAGE_VELORA_INVALID_VALUE}`
					})
				)
			).toBeInTheDocument();
		});

		it('should apply a preset and close', async () => {
			const { trigger, getByTestId, queryByTestId } = renderSlippage();

			await fireEvent.click(trigger);

			const editor = await waitFor(() => getByTestId('popover-content'));

			await fireEvent.click(within(editor).getByRole('button', { name: '3%' }));

			await waitFor(() => expect(queryByTestId('popover-content')).not.toBeInTheDocument());

			expect(within(trigger).getByText('3%')).toBeInTheDocument();
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});

		it('should return focus to the trigger when closed with Escape', async () => {
			const { trigger, getByTestId, queryByTestId } = renderSlippage();

			trigger.focus();

			await fireEvent.click(trigger);

			await waitFor(() => expect(getByTestId('popover-content')).toBeInTheDocument());

			await fireEvent.keyDown(window, { key: 'Escape' });

			await waitFor(() => expect(queryByTestId('popover-content')).not.toBeInTheDocument());

			expect(trigger).toHaveFocus();
		});
	});
});
