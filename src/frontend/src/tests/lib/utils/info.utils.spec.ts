import { saveHideInfo, shouldHideInfo, type HideInfoKey } from '$lib/utils/info.utils';

describe('info.utils', () => {
	describe('saveHideInfo', () => {
		const key = 'someKey' as HideInfoKey;

		beforeEach(() => {
			vi.resetAllMocks();

			localStorage.clear();

			vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		it('should save a value in localStorage', () => {
			saveHideInfo(key);

			expect(localStorage.getItem(key)).toBe('true');
		});

		it('should not throw errors even if localStorage is unavailable', () => {
			const originalLocalStorage = window.localStorage;

			Object.defineProperty(window, 'localStorage', {
				value: {
					setItem: vi.fn(() => {
						throw new Error('LocalStorage is full');
					})
				},
				writable: true
			});

			expect(() => saveHideInfo(key)).not.toThrow();

			Object.defineProperty(window, 'localStorage', {
				value: originalLocalStorage,
				writable: true
			});
		});
	});

	describe('shouldHideInfo', () => {
		const key = 'someKey' as HideInfoKey;

		beforeEach(() => {
			vi.resetAllMocks();

			localStorage.clear();

			vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		it('should return true if the value for the key is "true"', () => {
			localStorage.setItem(key, 'true');
			expect(shouldHideInfo(key)).toBe(true);
		});

		it('should return false if the value for the key is "false"', () => {
			localStorage.setItem(key, 'false');
			expect(shouldHideInfo(key)).toBe(false);
		});

		it('should return false if the key does not exist in localStorage', () => {
			expect(shouldHideInfo(key)).toBe(false);
		});

		it('should return false if localStorage is unavailable or throws an error', () => {
			const originalLocalStorage = window.localStorage;

			Object.defineProperty(window, 'localStorage', {
				value: {
					getItem: vi.fn(() => {
						throw new Error('LocalStorage is full');
					})
				},
				writable: true
			});

			expect(shouldHideInfo(key)).toBe(false);

			Object.defineProperty(window, 'localStorage', {
				value: originalLocalStorage,
				writable: true
			});
		});
	});
});
