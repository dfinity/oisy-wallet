import {
	forgetSwapSlippage,
	loadSwapSlippage,
	saveSwapSlippage
} from '$lib/utils/swap-slippage-storage.utils';

describe('swap-slippage-storage.utils', () => {
	beforeEach(() => {
		sessionStorage.clear();
		vi.restoreAllMocks();
	});

	it('should load nothing before a value is saved', () => {
		expect(loadSwapSlippage()).toBeUndefined();
	});

	it.each([
		{ slippageValue: '0.5', expected: 0.5 },
		{ slippageValue: '8.25', expected: 8.25 },
		{ slippageValue: 3, expected: 3 }
	])('should load $slippageValue back as $expected', ({ slippageValue, expected }) => {
		saveSwapSlippage(slippageValue);

		expect(loadSwapSlippage()).toBe(expected);
	});

	it('should keep the saved value when there is nothing to save', () => {
		saveSwapSlippage('3');
		saveSwapSlippage(undefined);

		expect(loadSwapSlippage()).toBe(3);
	});

	// Every sign-out clears the session storage, so the value never outlives the session.
	it('should be kept in the session storage only', () => {
		saveSwapSlippage('3');

		expect(sessionStorage).toHaveLength(1);
		expect(localStorage).toHaveLength(0);
	});

	it.each(['abc', '0', '-1', ''])('should ignore a stored "%s"', (stored) => {
		saveSwapSlippage('3');

		sessionStorage.setItem(sessionStorage.key(0) ?? '', stored);

		expect(loadSwapSlippage()).toBeUndefined();
	});

	it('should forget the saved value', () => {
		saveSwapSlippage('3');

		forgetSwapSlippage();

		expect(loadSwapSlippage()).toBeUndefined();
	});

	it('should fall back quietly when the storage throws', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('denied');
		});
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('denied');
		});
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
			throw new Error('denied');
		});

		expect(() => saveSwapSlippage('3')).not.toThrow();
		expect(loadSwapSlippage()).toBeUndefined();
		expect(() => forgetSwapSlippage()).not.toThrow();
	});
});
