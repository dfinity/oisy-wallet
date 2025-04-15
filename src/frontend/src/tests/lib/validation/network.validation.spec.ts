import { parseNetworkId } from '$lib/validation/network.validation';

describe('network.validation', () => {
	describe('parseNetworkId', () => {
		it('should correctly parse a string into a symbol NetworkId', () => {
			const networkId = parseNetworkId('testNetworkId');

			expect(typeof networkId).toBe('symbol');
		});

		it('should fail to parse non-string input', () => {
			const invalidInput = 123;

			expect(() => parseNetworkId(invalidInput as unknown as string)).toThrow();
		});
	});
});
