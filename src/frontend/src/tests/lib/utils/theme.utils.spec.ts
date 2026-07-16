import { Theme } from '$lib/types/theme';

const importThemeUtils = async ({ nodeRuntime }: { nodeRuntime: boolean }) => {
	vi.doMock('$lib/utils/env.utils', async (importOriginal) => ({
		...(await importOriginal()),
		isNode: () => nodeRuntime
	}));

	vi.resetModules();

	return await import('$lib/utils/theme.utils');
};

const resetThemeDom = () => {
	document.documentElement.removeAttribute('theme');
	document.documentElement.removeAttribute('style');
	document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
		meta.remove();
	});
};

const appendThemeColorMeta = (): HTMLMetaElement => {
	const meta = document.createElement('meta');
	meta.setAttribute('name', 'theme-color');
	document.head.append(meta);

	return meta;
};

const mockMatchMedia = (matches: boolean): ReturnType<typeof vi.fn> => {
	const matchMedia = vi.fn().mockReturnValue({ matches });

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: matchMedia
	});

	return matchMedia;
};

describe('theme.utils', () => {
	afterEach(() => {
		vi.doUnmock('$lib/utils/env.utils');
		vi.resetModules();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		localStorage.clear();
		resetThemeDom();
	});

	describe('initTheme', () => {
		it('should not mutate the DOM in the Node runtime', async () => {
			const { initTheme, LOCALSTORAGE_THEME_KEY, THEME_ATTRIBUTE } = await importThemeUtils({
				nodeRuntime: true
			});

			document.documentElement.setAttribute(THEME_ATTRIBUTE, Theme.LIGHT);

			expect(initTheme()).toBeUndefined();
			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(Theme.LIGHT);
			expect(localStorage.getItem(LOCALSTORAGE_THEME_KEY)).toBeNull();
		});

		it('should initialize from a valid DOM theme without preserving it as a user selection', async () => {
			const { initTheme, LOCALSTORAGE_THEME_KEY, THEME_ATTRIBUTE } = await importThemeUtils({
				nodeRuntime: false
			});

			const meta = appendThemeColorMeta();
			document.documentElement.setAttribute(THEME_ATTRIBUTE, Theme.LIGHT);
			document.documentElement.style.setProperty('--theme-color', '#fdfdfd');

			expect(initTheme()).toBe(Theme.LIGHT);
			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(Theme.LIGHT);
			expect(meta.getAttribute('content')).toBe('#fdfdfd');
			expect(localStorage.getItem(LOCALSTORAGE_THEME_KEY)).toBeNull();
		});

		it('should default to dark when the DOM theme is absent or invalid', async () => {
			const { initTheme, LOCALSTORAGE_THEME_KEY, THEME_ATTRIBUTE } = await importThemeUtils({
				nodeRuntime: false
			});

			document.documentElement.setAttribute(THEME_ATTRIBUTE, 'sepia');

			expect(initTheme()).toBe(Theme.DARK);
			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(Theme.DARK);
			expect(localStorage.getItem(LOCALSTORAGE_THEME_KEY)).toBeNull();
		});
	});

	describe('applyTheme', () => {
		it('should set the DOM theme, update the theme-color meta tag, and preserve the selection by default', async () => {
			const { applyTheme, LOCALSTORAGE_THEME_KEY, THEME_ATTRIBUTE } = await importThemeUtils({
				nodeRuntime: false
			});

			const meta = appendThemeColorMeta();
			document.documentElement.style.setProperty('--theme-color', '#101820');

			applyTheme({ theme: Theme.DARK });

			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(Theme.DARK);
			expect(meta.getAttribute('content')).toBe('#101820');
			expect(localStorage.getItem(LOCALSTORAGE_THEME_KEY)).toBe(JSON.stringify(Theme.DARK));
		});

		it('should apply the DOM theme without writing local storage when preserve is false', async () => {
			const { applyTheme, LOCALSTORAGE_THEME_KEY, THEME_ATTRIBUTE } = await importThemeUtils({
				nodeRuntime: false
			});

			applyTheme({ theme: Theme.LIGHT, preserve: false });

			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(Theme.LIGHT);
			expect(localStorage.getItem(LOCALSTORAGE_THEME_KEY)).toBeNull();
		});
	});

	describe('getThemeFromSystemSettings', () => {
		it('should return dark when the system prefers a dark color scheme', async () => {
			const { getThemeFromSystemSettings } = await importThemeUtils({ nodeRuntime: false });
			const matchMedia = mockMatchMedia(true);

			expect(getThemeFromSystemSettings()).toBe(Theme.DARK);
			expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(prefers-color-scheme: dark)');
		});

		it('should return light when the system does not prefer a dark color scheme', async () => {
			const { getThemeFromSystemSettings } = await importThemeUtils({ nodeRuntime: false });
			mockMatchMedia(false);

			expect(getThemeFromSystemSettings()).toBe(Theme.LIGHT);
		});
	});

	describe('resetTheme', () => {
		it('should remove the preserved selection and apply the provided theme without storing it again', async () => {
			const { LOCALSTORAGE_THEME_KEY, THEME_ATTRIBUTE, resetTheme } = await importThemeUtils({
				nodeRuntime: false
			});

			localStorage.setItem(LOCALSTORAGE_THEME_KEY, JSON.stringify(Theme.DARK));

			resetTheme(Theme.LIGHT);

			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(Theme.LIGHT);
			expect(localStorage.getItem(LOCALSTORAGE_THEME_KEY)).toBeNull();
		});
	});

	describe('isThemeSelected', () => {
		it('should return whether a non-empty theme selection is stored', async () => {
			const { LOCALSTORAGE_THEME_KEY, isThemeSelected } = await importThemeUtils({
				nodeRuntime: false
			});

			expect(isThemeSelected()).toBeFalsy();

			localStorage.setItem(LOCALSTORAGE_THEME_KEY, '');

			expect(isThemeSelected()).toBeFalsy();

			localStorage.setItem(LOCALSTORAGE_THEME_KEY, JSON.stringify(Theme.DARK));

			expect(isThemeSelected()).toBeTruthy();
		});
	});
});
