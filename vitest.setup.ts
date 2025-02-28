import { mockPage } from '$tests/mocks/page.store.mock';
import {
	allowLoggingForDebugging,
	failTestsThatLogToConsole
} from '$tests/utils/console.test-utils';
import { HttpAgent } from '@dfinity/agent';
import { nonNullish } from '@dfinity/utils';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { writable, type StartStopNotifier } from 'svelte/store';
import { beforeEach, vi } from 'vitest';
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

const resetStoreFunctions: (() => void)[] = vi.hoisted(() => []);

vi.mock('svelte/store', async (importOriginal) => {
	const svelteStoreModule: { [key: string | number | symbol]: unknown } = await importOriginal();
	return {
		...svelteStoreModule,
		// eslint-disable-next-line local-rules/prefer-object-params
		writable: <T>(
			initialValue: T | undefined,
			...otherArgs: (StartStopNotifier<T> | undefined)[]
		) => {
			const writableFunction = svelteStoreModule.writable as typeof writable;

			const store = writableFunction<T>(initialValue, ...otherArgs);

			if (nonNullish(initialValue)) {
				resetStoreFunctions.push(() => store.set(initialValue));
			}

			return store;
		}
	};
});

beforeEach(() => {
	for (const reset of resetStoreFunctions) {
		reset();
	}
});
