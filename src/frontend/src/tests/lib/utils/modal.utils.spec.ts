import { getSymbol } from '$lib/utils/modal.utils';

describe('modal.utils', () => {
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
