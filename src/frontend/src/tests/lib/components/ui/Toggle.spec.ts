import Toggle from '$lib/components/ui/Toggle.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('Toggle', () => {
	it('labels a row switch and activates it once from its label', async () => {
		const onToggle = vi.fn();
		const { getByRole, getByText } = render(Toggle, {
			checked: false,
			ariaLabel: en.tokens.text.hide_zero_balances,
			showLabel: true,
			onToggle
		});
		const control = getByRole('switch', { name: en.tokens.text.hide_zero_balances });

		expect(control).not.toBeChecked();

		await fireEvent.click(getByText(en.tokens.text.hide_zero_balances));

		expect(onToggle).toHaveBeenCalledExactlyOnceWith(true);
		expect(control.closest('button')).toBeNull();
	});

	it('exposes checked and disabled state', () => {
		const { getByRole } = render(Toggle, {
			checked: true,
			disabled: true,
			showLabel: true,
			ariaLabel: en.tokens.text.hide_zero_balances
		});

		expect(getByRole('switch')).toBeChecked();
		expect(getByRole('switch')).toBeDisabled();
	});
});
