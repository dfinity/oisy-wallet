import SwapSwitchTokensButton from '$lib/components/swap/SwapSwitchTokensButton.svelte';
import { SWAP_SWITCH_TOKENS_BUTTON } from '$lib/constants/test-ids.constants';
import { fireEvent, render } from '@testing-library/svelte';

describe('SwapSwitchTokensButton', () => {
	const arrow = (button: HTMLElement): Element | null =>
		button.querySelector('.transition-\\[rotate\\]');

	it('should switch the tokens on click', async () => {
		const onTokensSwitch = vi.fn();

		const { getByTestId } = render(SwapSwitchTokensButton, { props: { onTokensSwitch } });

		await fireEvent.click(getByTestId(SWAP_SWITCH_TOKENS_BUTTON));

		expect(onTokensSwitch).toHaveBeenCalledOnce();
	});

	it('should turn the arrow a half-turn per switch and back on the next one', async () => {
		const { getByTestId } = render(SwapSwitchTokensButton, {
			props: { onTokensSwitch: vi.fn() }
		});

		const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);

		expect(arrow(button)).not.toHaveClass('rotate-180');

		await fireEvent.click(button);

		expect(arrow(button)).toHaveClass('rotate-180');

		await fireEvent.click(button);

		expect(arrow(button)).not.toHaveClass('rotate-180');
	});

	it('should press like an icon-size control rather than a text button', () => {
		const { getByTestId } = render(SwapSwitchTokensButton, {
			props: { onTokensSwitch: vi.fn() }
		});

		const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);

		expect(button).toHaveClass('press-icon');
	});
});
