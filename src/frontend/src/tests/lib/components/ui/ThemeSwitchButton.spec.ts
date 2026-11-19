import ThemeSwitchButton from '$lib/components/ui/ThemeSwitchButton.svelte';
import { themeStore } from '$lib/stores/theme.store';
import { Theme } from '$lib/types/theme';
import { fireEvent, render } from '@testing-library/svelte';

describe('ThemeSwitchButton', () => {
	it('cross-fades the mounted moon and sun when switching theme', async () => {
		themeStore.select(Theme.LIGHT);
		const { getByRole } = render(ThemeSwitchButton);
		const button = getByRole('button');
		const icons = [...button.querySelectorAll('svg')];
		const layers = button.querySelectorAll('.layer');

		expect(layers).toHaveLength(2);
		expect(layers[0]).toHaveAttribute('aria-hidden', 'false');

		await fireEvent.click(button);

		expect([...button.querySelectorAll('svg')]).toEqual(icons);
		expect(layers[0]).toHaveAttribute('aria-hidden', 'true');
		expect(layers[1]).toHaveAttribute('aria-hidden', 'false');

		await fireEvent.click(button);

		expect(layers[0]).toHaveAttribute('aria-hidden', 'false');
	});
});
