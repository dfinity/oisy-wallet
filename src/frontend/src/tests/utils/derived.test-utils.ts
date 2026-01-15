import { tick } from 'svelte';
import type { Readable, Unsubscriber } from 'svelte/store';
import type { MockInstance } from 'vitest';

type DerivedModule = Record<string, unknown>;

const moduleGroups = [
	['$eth', import.meta.glob<DerivedModule>('$eth/derived/**/*.derived.ts', { eager: true })],
	['$evm', import.meta.glob<DerivedModule>('$evm/derived/**/*.derived.ts', { eager: true })],
	['$icp', import.meta.glob<DerivedModule>('$icp/derived/**/*.derived.ts', { eager: true })],
	[
		'$icp-eth',
		import.meta.glob<DerivedModule>('$icp-eth/derived/**/*.derived.ts', { eager: true })
	],
	['$lib', import.meta.glob<DerivedModule>('$lib/derived/**/*.derived.ts', { eager: true })],
	['$sol', import.meta.glob<DerivedModule>('$sol/derived/**/*.derived.ts', { eager: true })]
] as const;

const isReadable = (value: unknown): value is Readable<unknown> =>
	typeof value === 'object' &&
	value !== null &&
	'subscribe' in value &&
	typeof (value as { subscribe: unknown }).subscribe === 'function';

const derivedList: Record<string, Readable<unknown>> = {};

for (const [modulePath, modules] of moduleGroups) {
	for (const module of Object.values(modules)) {
		for (const [name, exported] of Object.entries(module)) {
			if (isReadable(exported)) {
				derivedList[`${modulePath}:${name}`] = exported;
			}
		}
	}
}

export const testDerivedUpdates = async (changeStore: () => void) => {
	const { derivedMocks, unsubscribers } = Object.entries(derivedList).reduce<{
		derivedMocks: MockInstance[];
		unsubscribers: Unsubscriber[];
	}>(
		({ derivedMocks, unsubscribers }, [key, derivedStore]) => {
			const mockFn = vi.fn().mockName(key);
			return {
				derivedMocks: [...derivedMocks, mockFn],
				unsubscribers: [...unsubscribers, derivedStore.subscribe(mockFn)]
			};
		},
		{ derivedMocks: [], unsubscribers: [] }
	);

	try {
		// Initialisation call
		derivedMocks.forEach((mockFn) => expect(mockFn).toHaveBeenCalledOnce());

		changeStore();

		await tick();

		derivedMocks.forEach((mockFn) => {
			const callCount = mockFn.mock.calls.length;
			assert(callCount <= 2, `${mockFn.getMockName()} was called ${callCount} times`);
		});
	} finally {
		unsubscribers.forEach((unsub) => unsub());
	}
};
