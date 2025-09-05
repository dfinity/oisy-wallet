import { saveHideInfo, shouldHideInfo, type HideInfoKey } from '$lib/utils/info.utils';

describe('info.utils', () => {
	describe('saveHideInfo', () => {
		const key = 'someKey' as HideInfoKey;

		beforeEach(() => {
			vi.clearAllMocks();

			sessionStorage.clear();
		});

		it('should save a value in localStorage', () => {
			saveHideInfo(key);

			expect(sessionStorage.getItem(key)).toBe('true');
		});

		it('should not throw errors even if sessionStorage is unavailable', () => {
			const originalSessionStorage = window.sessionStorage;

			Object.defineProperty(window, 'sessionStorage', {
				value: {
					setItem: vi.fn(() => {
						throw new Error('SessionStorage is full');
					})
				},
				writable: true
			});

			expect(() => saveHideInfo(key)).not.toThrow();

			Object.defineProperty(window, 'sessionStorage', {
				value: originalSessionStorage,
				writable: true
			});
		});
	});

	describe('shouldHideInfo', () => {
		const key = 'someKey' as HideInfoKey;

		beforeEach(() => {
			vi.resetAllMocks();

			sessionStorage.clear();
		});

		it('should return true if the value for the key is "true"', () => {
			sessionStorage.setItem(key, 'true');

			expect(shouldHideInfo(key)).toBeTruthy();
		});

		it('should return false if the value for the key is "false"', () => {
			sessionStorage.setItem(key, 'false');

			expect(shouldHideInfo(key)).toBeFalsy();
		});

		it('should return false if the key does not exist in sessionStorage', () => {
			expect(shouldHideInfo(key)).toBeFalsy();
		});

		it('should return false if sessionStorage is unavailable or throws an error', () => {
			const originalSessionStorage = window.sessionStorage;

			Object.defineProperty(window, 'sessionStorage', {
				value: {
					getItem: vi.fn(() => {
						throw new Error('SessionStorage is full');
					})
				},
				writable: true
			});

			expect(shouldHideInfo(key)).toBeFalsy();

			Object.defineProperty(window, 'sessionStorage', {
				value: originalSessionStorage,
				writable: true
			});
		});
	});
});
