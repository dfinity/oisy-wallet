import MenuThemeSelector from '$lib/components/core/MenuThemeSelector.svelte';
import { THEME_SELECTOR_CARD } from '$lib/constants/test-ids.constants';
import { Theme, themeStore } from '@dfinity/gix-components';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('MenuThemeSelector', () => {
	const originalMatchMedia = window.matchMedia;

	const THEME_SYSTEM = 'system';
	const THEME_VALUES = [...Object.values(Theme), THEME_SYSTEM];
	const THEME_KEY = 'nnsTheme';

	beforeEach(() => {
		vi.resetAllMocks();
		vi.clearAllMocks();

		localStorage.clear();

		// We mock window.matchMedia to match the DARK theme
		Object.defineProperty(window, 'matchMedia', {
			value: vi.fn().mockImplementation(() => ({
				matches: false
			}))
		});
	});

	afterAll(() => {
		Object.defineProperty(window, 'matchMedia', {
			value: originalMatchMedia
		});
	});

	it('should render all theme options', () => {
		const { getByTestId } = render(MenuThemeSelector);

		THEME_VALUES.forEach((theme) => {
			expect(getByTestId(`${THEME_SELECTOR_CARD}-${theme}`)).toBeTruthy();
		});
	});

	it('should set the correct theme option', async () => {
		const spy = vi.spyOn(themeStore, 'select');

		const { getByTestId } = render(MenuThemeSelector);

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.DARK}`));

		expect(get(themeStore)).toBe(Theme.DARK);
		expect(spy).toHaveBeenCalledWith(Theme.DARK);
		expect(localStorage.getItem(THEME_KEY)).toBe(JSON.stringify(Theme.DARK));

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.LIGHT}`));

		expect(get(themeStore)).toBe(Theme.LIGHT);
		expect(spy).toHaveBeenCalledWith(Theme.LIGHT);
		expect(localStorage.getItem(THEME_KEY)).toBe(JSON.stringify(Theme.LIGHT));

		// We repeat the test just to make sure that the theme is actually changing
		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.DARK}`));

		expect(get(themeStore)).toBe(Theme.DARK);
		expect(spy).toHaveBeenCalledWith(Theme.DARK);
		expect(localStorage.getItem(THEME_KEY)).toBe(JSON.stringify(Theme.DARK));

		spy.mockRestore();
	});

	it('should call set the System theme when clicking on the System option', async () => {
		const spy = vi.spyOn(themeStore, 'resetToSystemSettings');

		const { getByTestId } = render(MenuThemeSelector);

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.DARK}`));

		expect(localStorage.getItem(THEME_KEY)).toBe(JSON.stringify(Theme.DARK));

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${THEME_SYSTEM}`));

		expect(get(themeStore)).toBe(Theme.LIGHT);
		expect(spy).toHaveBeenCalledOnce();
		expect(localStorage.getItem(THEME_KEY)).toBeNull();

		spy.mockRestore();
	});

	it('should save "null" to localStorage when selecting system theme', async () => {
		const { getByTestId } = render(MenuThemeSelector);

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${Theme.DARK}`));

		await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${THEME_SYSTEM}`));

		expect(localStorage.getItem(THEME_KEY)).toBeNull();
	});

	it.each(THEME_VALUES)(
		'should set correct "primary" class (indicates selected) for "%s" theme option',
		async (theme) => {
			const { getByTestId } = render(MenuThemeSelector);

			await fireEvent.click(getByTestId(`${THEME_SELECTOR_CARD}-${theme}`));

			expect(getByTestId(`${THEME_SELECTOR_CARD}-${theme}`).getAttribute('class')).toContain(
				'primary'
			);

			THEME_VALUES.filter((t) => t !== theme).forEach((otherTheme) => {
				expect(
					getByTestId(`${THEME_SELECTOR_CARD}-${otherTheme}`).getAttribute('class')
				).not.toContain('primary');
			});
		}
	);

	it('should set correct "primary" class (indicates selected) when switching back and forth between themes', async () => {
		const { getByTestId } = render(MenuThemeSelector);

		const testIdSystem = `${THEME_SELECTOR_CARD}-${THEME_SYSTEM}`;
		const testIdDark = `${THEME_SELECTOR_CARD}-${Theme.DARK}`;
		const testIdLight = `${THEME_SELECTOR_CARD}-${Theme.LIGHT}`;

		await fireEvent.click(getByTestId(testIdSystem));

		expect(getByTestId(testIdSystem).getAttribute('class')).toContain('primary');

		await fireEvent.click(getByTestId(testIdDark));

		expect(getByTestId(testIdDark).getAttribute('class')).toContain('primary');

		await fireEvent.click(getByTestId(testIdSystem));

		expect(getByTestId(testIdSystem).getAttribute('class')).toContain('primary');

		await fireEvent.click(getByTestId(testIdLight));

		expect(getByTestId(testIdLight).getAttribute('class')).toContain('primary');

		await fireEvent.click(getByTestId(testIdSystem));

		expect(getByTestId(testIdSystem).getAttribute('class')).toContain('primary');

		await fireEvent.click(getByTestId(testIdDark));

		expect(getByTestId(testIdDark).getAttribute('class')).toContain('primary');

		await fireEvent.click(getByTestId(testIdLight));

		expect(getByTestId(testIdLight).getAttribute('class')).toContain('primary');

		await fireEvent.click(getByTestId(testIdDark));

		expect(getByTestId(testIdDark).getAttribute('class')).toContain('primary');
	});
});
