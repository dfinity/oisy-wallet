import { Theme } from '$lib/types/theme';
import { get } from 'svelte/store';

type ThemeStoreModule = typeof import('$lib/stores/theme.store');
type ThemeUtilsModule = typeof import('$lib/utils/theme.utils');

const importThemeStore = async ({
	initialTheme,
	systemTheme = Theme.LIGHT
}: {
	initialTheme: Theme | undefined;
	systemTheme?: Theme;
}): Promise<ThemeStoreModule> => {
	vi.doMock('$lib/utils/theme.utils', () => ({
		initTheme: vi.fn(() => initialTheme),
		applyTheme: vi.fn(),
		getThemeFromSystemSettings: vi.fn(() => systemTheme),
		resetTheme: vi.fn()
	}));

	vi.resetModules();

	return await import('$lib/stores/theme.store');
};

const importMockedThemeUtils = async (): Promise<ThemeUtilsModule> =>
	await import('$lib/utils/theme.utils');

describe('theme.store', () => {
	afterEach(() => {
		vi.doUnmock('$lib/utils/theme.utils');
		vi.resetModules();
		vi.clearAllMocks();
	});

	describe('initThemeStore', () => {
		it('should initialize with the current theme', async () => {
			const { initThemeStore } = await importThemeStore({ initialTheme: Theme.DARK });
			const { initTheme } = await importMockedThemeUtils();

			const store = initThemeStore();

			expect(get(store)).toBe(Theme.DARK);
			expect(initTheme).toHaveBeenCalledExactlyOnceWith();
		});

		it('should initialize as undefined when no DOM theme can be inferred', async () => {
			const { initThemeStore } = await importThemeStore({ initialTheme: undefined });

			const store = initThemeStore();

			expect(get(store)).toBeUndefined();
		});

		it('should apply, preserve, and publish an explicit theme selection', async () => {
			const { initThemeStore } = await importThemeStore({ initialTheme: Theme.LIGHT });
			const { applyTheme } = await importMockedThemeUtils();

			const store = initThemeStore();

			store.select(Theme.DARK);

			expect(applyTheme).toHaveBeenCalledExactlyOnceWith({ theme: Theme.DARK, preserve: true });
			expect(get(store)).toBe(Theme.DARK);
		});

		it('should reset to the system theme and publish it', async () => {
			const { initThemeStore } = await importThemeStore({
				initialTheme: Theme.DARK,
				systemTheme: Theme.LIGHT
			});
			const { getThemeFromSystemSettings, resetTheme } = await importMockedThemeUtils();

			const store = initThemeStore();

			store.resetToSystemSettings();

			expect(getThemeFromSystemSettings).toHaveBeenCalledExactlyOnceWith();
			expect(resetTheme).toHaveBeenCalledExactlyOnceWith(Theme.LIGHT);
			expect(get(store)).toBe(Theme.LIGHT);
		});
	});
});
