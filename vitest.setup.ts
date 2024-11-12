import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { mockPage } from './src/frontend/src/tests/mocks/page.store.mock';

vi.mock('$app/stores', () => ({
	page: mockPage
}));

configure({
	testIdAttribute: 'data-tid'
});
