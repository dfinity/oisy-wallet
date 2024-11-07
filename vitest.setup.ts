import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
//
// const resetStoreFunctions: (() => void)[] = vi.hoisted(() => []);
//
// vi.mock('svelte/store', async (importOriginal) => {
// 	const svelteStoreModule: { [key: string | number | symbol]: unknown } = await importOriginal();
// 	return {
// 		...svelteStoreModule,
// 		// eslint-disable-next-line local-rules/prefer-object-params
// 		writable: <T>(
// 			initialValue: T | undefined,
// 			...otherArgs: (StartStopNotifier<T> | undefined)[]
// 		) => {
// 			const writableFunction = svelteStoreModule.writable as typeof writable;
//
// 			const store = writableFunction<T>(initialValue, ...otherArgs);
//
// 			if (nonNullish(initialValue)) {
// 				resetStoreFunctions.push(() => store.set(initialValue));
// 			}
//
// 			return store;
// 		}
// 	};
// });
//
// beforeEach(() => {
// 	for (const reset of resetStoreFunctions) {
// 		reset();
// 	}
// });
