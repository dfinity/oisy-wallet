import { bottomSheetOpenStore } from '$lib/stores/ui.store';
import { get } from 'svelte/store';

describe('ui.store', () => {
	describe('bottomSheetOpenStore', () => {
		beforeEach(() => {
			bottomSheetOpenStore.set(false);
		});

		it('should initialize as false', () => {
			expect(get(bottomSheetOpenStore)).toBe(false);
		});

		it('should update to true when set', () => {
			bottomSheetOpenStore.set(true);
			expect(get(bottomSheetOpenStore)).toBe(true);
		});

		it('should toggle correctly', () => {
			bottomSheetOpenStore.set(true);
			expect(get(bottomSheetOpenStore)).toBe(true);

			bottomSheetOpenStore.set(false);
			expect(get(bottomSheetOpenStore)).toBe(false);
		});
	});
});
