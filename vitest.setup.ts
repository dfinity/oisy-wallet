import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { mockPage } from './src/frontend/src/tests/mocks/page.store.mock';

// We mock ResizeObserver and element.animate because neither JSDOM nor Happy DOM supports them, while Svelte v5 requires them.
// Interesting related thread: https://github.com/testing-library/svelte-testing-library/issues/284
global.ResizeObserver = class ResizeObserver {
	observe() {
		// do nothing
	}
	unobserve() {
		// do nothing
	}
	disconnect() {
		// do nothing
	}
};

Element.prototype.animate = vi
	.fn()
	.mockImplementation(() => ({ cancel: vi.fn(), finished: Promise.resolve() }));

vi.mock('$app/stores', () => ({
	page: mockPage
}));

configure({
	testIdAttribute: 'data-tid'
});
