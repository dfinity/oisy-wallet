import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { mockPage } from './src/frontend/src/tests/mocks/page.store.mock';

vi.mock('$app/stores', () => ({
	page: mockPage
}));
