import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { page } from './src/frontend/src/tests/mocks/page.store.mock';

vi.mock('$app/stores', () => ({
	page
}));
