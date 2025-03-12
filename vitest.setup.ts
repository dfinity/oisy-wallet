import { mockPage } from '$tests/mocks/page.store.mock';
import {
	allowLoggingForDebugging,
	failTestsThatLogToConsole
} from '$tests/utils/console.test-utils';
import { HttpAgent } from '@dfinity/agent';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('$app/stores', () => ({
	page: mockPage
}));

vi.mock(import('$lib/actors/agents.ic'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		// eslint-disable-next-line require-await
		getAgent: async () => mock<HttpAgent>()
	};
});

failTestsThatLogToConsole();

if (process.env.ALLOW_LOGGING_FOR_DEBUGGING) {
	allowLoggingForDebugging();
}

configure({
	testIdAttribute: 'data-tid'
});
