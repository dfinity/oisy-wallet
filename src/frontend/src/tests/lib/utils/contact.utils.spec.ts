import { selectColorForName } from '$lib/utils/contact.utils';

describe('contact.utils', () => {
	describe('selectColorForName', () => {
		it('should return a color from the array based on the name', () => {
			const colors = ['red', 'green', 'blue'];

			expect(selectColorForName({ colors, name: 'John 1' })).toEqual('red');
			expect(selectColorForName({ colors, name: 'John 2' })).toEqual('green');
			expect(selectColorForName({ colors, name: 'John 3' })).toEqual('blue');
			expect(selectColorForName({ colors, name: 'John 4' })).toEqual('red');
			expect(selectColorForName({ colors, name: 'John 4 ' })).toEqual('red');
		});

		it('should return the same color for the same name', () => {
			const colors = ['red', 'green', 'blue'];
			const name = 'John Doe';

			const result1 = selectColorForName({ colors, name });
			const result2 = selectColorForName({ colors, name });

			expect(result1).toBe(result2);
		});

		it('should return undefined if name is empty', () => {
			const colors = ['red', 'green', 'blue'];

			expect(selectColorForName({ colors, name: '' })).toBeUndefined();
			expect(selectColorForName({ colors, name: '   ' })).toBeUndefined();
			expect(selectColorForName({ colors, name: undefined })).toBeUndefined();
		});

		it('should throw an error if colors array is empty', () => {
			expect(() => selectColorForName({ colors: [], name: 'John Doe' })).toThrow(
				'Colors array cannot be empty'
			);
		});
	});
});
