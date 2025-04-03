import * as analytics from '$lib/services/analytics.services';
import App from '$routes/+layout.svelte';
import { render } from '@testing-library/svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/services/worker.auth.services', () => ({
	initAuthWorker: vi.fn().mockResolvedValue({
		syncAuthIdle: vi.fn()
	})
}));

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
	it('should initialize analytics tracking on mount', () => {
		const spy = vi.spyOn(analytics, 'initPlausibleAnalytics');

		expect(spy).not.toHaveBeenCalled();

		render(App);

		expect(spy).toHaveBeenCalledTimes(1);
	});
});
