import ThemeSelector from '$lib/components/settings/ThemeSelector.svelte';
import { THEME_SELECTOR_CARD } from '$lib/constants/test-ids.constants';
import { THEME_VALUES } from '$lib/constants/themes.constants';
import { SystemTheme } from '$lib/enums/themes';
import { Theme, themeStore } from '@dfinity/gix-components';
import { fireEvent, render } from '@testing-library/svelte';

describe('ThemeSelector', () => {
	beforeEach(() => {
		vi.spyOn(themeStore, 'select').mockImplementation(vi.fn());
	});

	it('should render all theme options', () => {
		const { getByTestId } = render(ThemeSelector);

		THEME_VALUES.forEach((theme) => {
			expect(getByTestId(`${THEME_SELECTOR_CARD}-${theme}`)).toBeTruthy();
		});
	});

	it('should call themeStore.select when clicking a theme option', async () => {
		const { getByTestId } = render(ThemeSelector);

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.DARK}`));

		expect(themeStore.select).toHaveBeenCalledWith(Theme.DARK);

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.LIGHT}`));

		expect(themeStore.select).toHaveBeenCalledWith(Theme.LIGHT);
	});

	it('should save "null" to localStorage when selecting system theme', async () => {
		const { getByTestId } = render(ThemeSelector);

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${SystemTheme.SYSTEM}`));

		expect(localStorage.getItem('nnsTheme')).toBe(JSON.stringify(null));
	});

	it('should set correct tabindex for each theme option', () => {
		const { getByTestId } = render(ThemeSelector);

		expect(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.DARK}`).getAttribute('tabindex')).toBe('0');
		expect(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.LIGHT}`).getAttribute('tabindex')).toBe('1');
		expect(
			getByTestId(`${THEME_SELECTOR_CARD}-${SystemTheme.SYSTEM}`).getAttribute('tabindex')
		).toBe('2');
	});
});
