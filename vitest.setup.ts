import { mockPage } from '$tests/mocks/page.store.mock';
import { failTestsThatLogToConsole } from '$tests/utils/console.test-utils';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

vi.mock('$app/stores', () => ({
	page: mockPage
}));

failTestsThatLogToConsole();

configure({
	testIdAttribute: 'data-tid'
});
