import { solTokenSymbol, solUnknownTokenAddresses } from '$sol/utils/sol-token-name.utils';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

describe('sol-token-name.utils', () => {
	const tokens = [{ ...mockValidSplToken, version: undefined, enabled: true }];
	const { network } = mockValidSplToken;
	const args = {
		tokens,
		networkId: network.id,
		unknownTokenLabel: 'Unknown token',
		nativeSymbol: 'SOL'
	};

	describe('solTokenSymbol', () => {
		it('should prefer the token the wallet lists', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: mockValidSplToken.address,
					metadata: { [mockValidSplToken.address]: { name: 'Other', symbol: 'OTHER' } },
					unknownTokenAddresses: []
				})
			).toBe(mockValidSplToken.symbol);
		});

		// One account read names a Token-2022 mint the wallet does not list, which is the whole
		// point of asking: a placeholder tells the user nothing.
		it('should use the symbol the mint carries in its own account', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: 'unlisted-mint',
					metadata: { 'unlisted-mint': { name: 'Pump', symbol: 'PUMP' } },
					unknownTokenAddresses: []
				})
			).toBe('PUMP');
		});

		it('should fall back to the placeholder, unnumbered when it stands alone', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: 'nameless',
					metadata: {},
					unknownTokenAddresses: ['nameless']
				})
			).toBe('Unknown token');
		});

		// Two rows both reading "Unknown token" are worse than an address: nothing tells them apart.
		it('should number the placeholders when a view holds more than one', () => {
			const unknownTokenAddresses = ['first', 'second'];

			expect(
				solTokenSymbol({ ...args, tokenAddress: 'second', metadata: {}, unknownTokenAddresses })
			).toBe('Unknown token 2');
		});

		it('should name native SOL without consulting anything', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: undefined,
					metadata: {},
					unknownTokenAddresses: []
				})
			).toBe('SOL');
		});
	});

	// The same mint address exists on several clusters and carries different data on each.
	it('should not lend one network name to another', () => {
		expect(
			solTokenSymbol({
				...args,
				tokenAddress: 'shared-address',
				metadata: {},
				unknownTokenAddresses: ['shared-address']
			})
		).toBe('Unknown token');
	});

	describe('solUnknownTokenAddresses', () => {
		it('should count only the mints nothing can name, once each and in order', () => {
			expect(
				solUnknownTokenAddresses({
					tokenAddresses: [
						undefined,
						mockValidSplToken.address,
						'named-on-chain',
						'nameless-b',
						'nameless-a',
						'nameless-b'
					],
					tokens,
					networkId: network.id,
					metadata: { 'named-on-chain': { name: 'Pump', symbol: 'PUMP' } }
				})
			).toStrictEqual(['nameless-b', 'nameless-a']);
		});
	});
});
