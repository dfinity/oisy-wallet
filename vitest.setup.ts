import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { mockPage } from './src/frontend/src/tests/mocks/page.store.mock';

vi.mock('$app/stores', () => ({
	page: mockPage
}));

vi.stubEnv('VITE_LOCAL_POUH_ISSUER_CANISTER_ID', 'qbw6f-caaaa-aaaah-qdcwa-cai');

configure({
	testIdAttribute: 'data-tid'
});
