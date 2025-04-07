import * as analytics from '$lib/services/analytics.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import App from '$routes/+layout.svelte';
import { render } from '@testing-library/svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/services/worker.auth.services', () => ({
	initAuthWorker: vi.fn().mockResolvedValue({
		syncAuthIdle: vi.fn()
	})
}));

vi.mock('$lib/services/analytics.services', async () => {
	const actual = await vi.importActual<typeof import('$lib/services/analytics.services')>(
		'$lib/services/analytics.services'
	);
	return {
		...actual,
		initAnalytics: vi
			.fn()
			.mockRejectedValue(
				new Error('Unexpected issue while syncing the status of your authentication.')
			),
		initPlausibleAnalytics: vi.fn()
	};
});

vi.mock('$lib/stores/auth.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/stores/auth.store')>();
	return {
		...actual,
		authStore: {
			...actual.authStore,
			sync: vi.fn().mockResolvedValue(undefined)
		}
	};
});

vi.mock('$lib/stores/i18n.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/stores/i18n.store')>();
	return {
		...actual,
		i18n: {
			...actual.i18n,
			init: vi.fn().mockResolvedValue(undefined)
		}
	};
});

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
		vi.clearAllMocks();

		render(App);

		expect(authStore.sync).toHaveBeenCalledTimes(1);
		expect(analytics.initAnalytics).toHaveBeenCalledTimes(1);
		expect(analytics.initPlausibleAnalytics).toHaveBeenCalledTimes(1);
		expect(i18n.init).toHaveBeenCalledTimes(1);
	});

	it('should initialize auth store on mount', () => {
		const spy = vi.spyOn(authStore, 'sync');

		expect(spy).not.toHaveBeenCalled();

		render(App);

		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('should initialize analytics tracking on mount', () => {
		const spy = vi.spyOn(analytics, 'initPlausibleAnalytics');

		expect(spy).not.toHaveBeenCalled();

		render(App);

		expect(spy).toHaveBeenCalledTimes(1);
	});
});
