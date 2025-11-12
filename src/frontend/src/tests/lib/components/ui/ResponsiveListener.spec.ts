import ResponsiveListener from '$lib/components/ui/ResponsiveListener.svelte';
import { screensStore } from '$lib/stores/screens.store';
import * as screensUtils from '$lib/utils/screens.utils';
import { AVAILABLE_SCREENS, MIN_SCREEN } from '$lib/utils/screens.utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ResponsiveListener', () => {
	const interval = 10_000;

	const setWindowInnerWidth = (width: number) => {
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: width
		});

		window.dispatchEvent(new Event('resize'));
	};

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should initialize the screens store to minimum screen', async () => {
		setWindowInnerWidth(0);

		render(ResponsiveListener);

		await vi.advanceTimersByTimeAsync(interval);

		expect(get(screensStore)).toBe(MIN_SCREEN);
	});

	it('should set the screens store to current screen', async () => {
		setWindowInnerWidth(1_000); // `lg` screen

		render(ResponsiveListener);

		await vi.advanceTimersByTimeAsync(interval);

		expect(get(screensStore)).toBe('lg');
	});

	it('should re-set the screens store when width changes', async () => {
		setWindowInnerWidth(1_000); // below `lg` screen

		render(ResponsiveListener);

		await vi.advanceTimersByTimeAsync(interval);

		expect(get(screensStore)).toBe('lg');

		setWindowInnerWidth(700); // below `md` screen

		await vi.advanceTimersByTimeAsync(interval);

		expect(get(screensStore)).toBe('md');
	});

	it('should call the util to get the active screen', () => {
		const spy = vi.spyOn(screensUtils, 'getActiveScreen');

		setWindowInnerWidth(1_000); // below `lg` screen

		render(ResponsiveListener);

		expect(spy).toHaveBeenCalledExactlyOnceWith({
			screenWidth: 1_000,
			availableScreensSortedByWidth: AVAILABLE_SCREENS
		});
	});
});
