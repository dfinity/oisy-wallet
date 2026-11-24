import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SwapSlippage from '$lib/components/swap/SwapSlippage.svelte';
import { SWAP_SLIPPAGE_VELORA_INVALID_VALUE } from '$lib/constants/swap.constants';
import { screensStore } from '$lib/stores/screens.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { OptionAmount } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { loadSwapSlippage } from '$lib/utils/swap-slippage-storage.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';

describe('SwapSlippage', () => {
	// Spread rather than a destructured default, so an explicit `slippageValue: undefined` stays
	// undefined. An ERC-20 source refuses from 15 %, an ICP source from 50 %.
	const renderSlippage = ({
		sourceToken = mockValidErc20Token,
		...overrides
	}: { slippageValue?: OptionAmount; sourceToken?: Token } = {}) => {
		const result = render(SwapSlippage, {
			props: {
				slippageValue: '1.5',
				...overrides
			},
			context: new Map([[SWAP_CONTEXT_KEY, initSwapContext({ sourceToken })]])
		});

		return {
			...result,
			trigger: result.getByRole('button', { name: new RegExp(`^${en.swap.text.max_slippage} `) })
		};
	};

	beforeEach(() => {
		screensStore.set('lg');
		sessionStorage.clear();
	});

	describe('trigger', () => {
		it('should show the value in primary text on the brand tint', () => {
			const { trigger } = renderSlippage();

			expect(trigger).toHaveTextContent(`${en.swap.text.max_slippage} 1.5%`);
			expect(trigger).toHaveClass('bg-brand-subtle-20', 'text-primary');
		});

		it.each([
			{ slippageValue: '12.3456', label: '12.34%' },
			{ slippageValue: '49.996', label: '49.99%' },
			{ slippageValue: '0.004', label: '0.004%' }
		])('should show $slippageValue as $label', ({ slippageValue, label }) => {
			const { trigger } = renderSlippage({ slippageValue, sourceToken: ICP_TOKEN });

			expect(trigger).toHaveTextContent(label);
		});

		// The pill shows the value and a settings icon only, so the label is screen-reader text that
		// keeps the visible value in the name.
		it('should be named by its label and the value it shows', () => {
			const { trigger } = renderSlippage();

			expect(trigger).toHaveAccessibleName(`${en.swap.text.max_slippage} 1.5%`);
		});

		it('should announce the editor it opens', () => {
			const { trigger } = renderSlippage();

			expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});

		it('should mark a high slippage with the warning tint', () => {
			const { trigger } = renderSlippage({ slippageValue: '8' });

			expect(trigger).toHaveTextContent(`${en.swap.text.max_slippage} 8%`);
			expect(trigger).toHaveClass('bg-warning-subtle-10', 'text-primary');
		});

		it.each([
			{ slippageValue: '15', label: '15%' },
			{ slippageValue: '0', label: '0%' },
			{ slippageValue: undefined, label: '0%' }
		])('should mark $slippageValue as refused with the error tint', ({ slippageValue, label }) => {
			const { trigger } = renderSlippage({ slippageValue });

			expect(trigger).toHaveTextContent(label);
			expect(trigger).toHaveClass('bg-error-subtle-10', 'text-primary');
		});

		it('should accept up to the limit of the source network', () => {
			const { trigger } = renderSlippage({ slippageValue: '15', sourceToken: ICP_TOKEN });

			expect(trigger).toHaveClass('bg-warning-subtle-10');
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

		it('should title the phone sheet', async () => {
			screensStore.set('xs');

			const { trigger, getByTestId } = renderSlippage();

			await fireEvent.click(trigger);

			const sheet = await waitFor(() => getByTestId('bottom-sheet'));

			expect(within(sheet).getByText(en.swap.text.max_slippage)).toBeInTheDocument();
		});

		it('should title the popover above the editor', async () => {
			const { trigger, getByTestId } = renderSlippage();

			await fireEvent.click(trigger);

			const popover = await waitFor(() => getByTestId('popover-content'));

			expect(within(popover).getByText(en.swap.text.max_slippage)).toBeInTheDocument();
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

		it('should save an accepted value for the next swap', async () => {
			const { trigger, getByTestId } = renderSlippage();

			await fireEvent.click(trigger);

			const editor = await waitFor(() => getByTestId('popover-content'));

			await fireEvent.click(within(editor).getByRole('button', { name: '3%' }));

			expect(loadSwapSlippage()).toBe(3);
		});

		// Saved on close, so the keystrokes on the way to the final value are not.
		it('should save a typed value once the editor closes', async () => {
			const { trigger, getByTestId, queryByTestId } = renderSlippage({ slippageValue: '8' });

			await fireEvent.click(trigger);

			const editor = await waitFor(() => getByTestId('popover-content'));

			const input = editor.querySelector('input[name="swap-slippage"]');

			assertNonNullish(input);

			await fireEvent.input(input, { target: { value: '2' } });
			await fireEvent.input(input, { target: { value: '2.5' } });

			expect(loadSwapSlippage()).toBeUndefined();

			await fireEvent.keyDown(window, { key: 'Escape' });

			await waitFor(() => expect(queryByTestId('popover-content')).not.toBeInTheDocument());

			expect(loadSwapSlippage()).toBe(2.5);
		});

		it('should save nothing while the editor stays closed', () => {
			renderSlippage({ slippageValue: '3' });

			expect(loadSwapSlippage()).toBeUndefined();
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
