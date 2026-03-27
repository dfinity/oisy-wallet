import { modalStore } from '$lib/stores/modal.store';
import { closeModal, getSymbol } from '$lib/utils/modal.utils';
import { waitFor } from '@testing-library/svelte';

describe('modal.utils', () => {
	describe('closeModal', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(modalStore, 'close');

			vi.spyOn(global, 'setTimeout');
		});

		it('should close the modal store', () => {
			closeModal(vi.fn());

			expect(modalStore.close).toHaveBeenCalledExactlyOnceWith();
		});

		it('should call the callback after a while', async () => {
			const reset = vi.fn();

			closeModal(reset);

			expect(setTimeout).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 250);

			await waitFor(() => {
				expect(reset).toHaveBeenCalledExactlyOnceWith();
			});
		});
	});

	describe('getSymbol', () => {
		it('should cache and return the modal id if it isnt cached yet', () => {
			const symbol = getSymbol('doesnt exist');

			expect(typeof symbol).toBe('symbol');
		});

		it('should return the same symbol if the modal id is cached', () => {
			const symbol1 = getSymbol('doesnt exist');
			const symbol2 = getSymbol('doesnt exist');

			expect(symbol1).toBe(symbol2);
		});
	});
});
