import { mockPage } from '$tests/mocks/page.store.mock';
import {
	allowLoggingForDebugging,
	failTestsThatLogToConsole
} from '$tests/utils/console.test-utils';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

vi.mock('$app/stores', () => ({
	page: mockPage
}));

failTestsThatLogToConsole();

if (process.env.ALLOW_LOGGING_FOR_DEBUGGING) {
	allowLoggingForDebugging();
}

configure({
	testIdAttribute: 'data-tid'
});
