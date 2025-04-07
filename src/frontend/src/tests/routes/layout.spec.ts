import * as analytics from '$lib/services/analytics.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import App from '$routes/+layout.svelte';
import { render } from '@testing-library/svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	});
});

describe('App Layout', () => {
	it('should render the app layout', () => {
		const { container } = render(App);

		expect(container).toBeTruthy();
	});

	it('should initialize all services in parallel', () => {
		const spyAuthSync = vi.spyOn(authStore, 'sync');
		const spyInitAnalytics = vi.spyOn(analytics, 'initAnalytics');
		const spyInitPlausible = vi.spyOn(analytics, 'initPlausibleAnalytics');
		const spyI18n = vi.spyOn(i18n, 'init');

		render(App);

		expect(spyAuthSync).toHaveBeenCalledTimes(1);
		expect(spyInitAnalytics).toHaveBeenCalledTimes(1);
		expect(spyInitPlausible).toHaveBeenCalledTimes(1);
		expect(spyI18n).toHaveBeenCalledTimes(1);
	});

	it('should initialize analytics tracking on mount', () => {
		const spy = vi.spyOn(analytics, 'initPlausibleAnalytics');

		expect(spy).not.toHaveBeenCalled();

		render(App);

		expect(spy).toHaveBeenCalledTimes(1);
	});
});
