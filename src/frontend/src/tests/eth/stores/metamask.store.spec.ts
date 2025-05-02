import { metamaskStore } from '$eth/stores/metamask.store';
import { get } from 'svelte/store';

describe('metamask.store', () => {
	describe('metamaskStore', () => {
		it('should have the expected initial value', () => {
			expect(get(metamaskStore)).toStrictEqual({ available: undefined });
		});

		it('should reset the value to undefined', () => {
			metamaskStore.set(true);

			expect(get(metamaskStore)).toStrictEqual({ available: true });

			metamaskStore.reset();

			expect(get(metamaskStore)).toStrictEqual({ available: undefined });
		});

		it.each([true, false])('should set the available value to %s', (available) => {
			metamaskStore.reset();

			expect(get(metamaskStore)).toStrictEqual({ available: undefined });

			metamaskStore.set(available);

			expect(get(metamaskStore)).toStrictEqual({ available });
		});
	});
});
