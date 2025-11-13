import { tick } from 'svelte';
import type { Readable, Unsubscriber } from 'svelte/store';
import type { MockInstance } from 'vitest';

type DerivedModule = Record<string, unknown>;

const derivedModulesEth = import.meta.glob<DerivedModule>('$eth/derived/**/*.derived.ts', {
	eager: true
});

const derivedModulesEvm = import.meta.glob<DerivedModule>('$evm/derived/**/*.derived.ts', {
	eager: true
});

const derivedModulesIcp = import.meta.glob<DerivedModule>('$icp/derived/**/*.derived.ts', {
	eager: true
});

const derivedModulesIcpEth = import.meta.glob<DerivedModule>('$icp-eth/derived/**/*.derived.ts', {
	eager: true
});

const derivedModulesLib = import.meta.glob<DerivedModule>('$lib/derived/**/*.derived.ts', {
	eager: true
});

const derivedModulesSol = import.meta.glob<DerivedModule>('$sol/derived/**/*.derived.ts', {
	eager: true
});

const isReadable = (value: unknown): value is Readable<unknown> => {
	return (
		typeof value === 'object' &&
		value !== null &&
		'subscribe' in value &&
		typeof (value as { subscribe: unknown }).subscribe === 'function'
	);
};

const derivedList: Record<string, Readable<unknown>> = {};

for (const module of Object.values(derivedModulesEth)) {
	for (const [name, exported] of Object.entries(module)) {
		if (isReadable(exported)) {
			derivedList[name] = exported;
		}
	}
}

for (const module of Object.values(derivedModulesEvm)) {
	for (const [name, exported] of Object.entries(module)) {
		if (isReadable(exported)) {
			derivedList[name] = exported;
		}
	}
}

for (const module of Object.values(derivedModulesIcp)) {
	for (const [name, exported] of Object.entries(module)) {
		if (isReadable(exported)) {
			derivedList[name] = exported;
		}
	}
}

for (const module of Object.values(derivedModulesIcpEth)) {
	for (const [name, exported] of Object.entries(module)) {
		if (isReadable(exported)) {
			derivedList[name] = exported;
		}
	}
}

for (const module of Object.values(derivedModulesLib)) {
	for (const [name, exported] of Object.entries(module)) {
		if (isReadable(exported)) {
			derivedList[name] = exported;
		}
	}
}

for (const module of Object.values(derivedModulesSol)) {
	for (const [name, exported] of Object.entries(module)) {
		if (isReadable(exported)) {
			derivedList[name] = exported;
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
		// Initialization call
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
