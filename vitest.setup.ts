import { nonNullish } from '@dfinity/utils';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { writable, type StartStopNotifier } from 'svelte/store';
import { beforeEach, vi } from 'vitest';
import { mockPage } from './src/frontend/src/tests/mocks/page.store.mock';

vi.mock('$app/stores', () => ({
	page: mockPage
}));

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
