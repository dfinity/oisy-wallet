import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SolanaNetworks } from '$sol/types/network';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { solTokenSymbol, solUnknownTokenAddresses } from '$sol/utils/sol-token-name.utils';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

describe('sol-token-name.utils', () => {
	const tokens = [{ ...mockValidSplToken, version: undefined, enabled: true }];
	const { network } = mockValidSplToken;
	const cluster = mapNetworkIdToNetwork(network.id);

	// The store holds a map per cluster, and a name is only ever read out of the one it was
	// fetched from.
	const on = (metadata: Record<string, { name: string; symbol: string }>) => ({
		[cluster ?? SolanaNetworks.mainnet]: metadata
	});
	const args = {
		tokens,
		networkId: network.id,
		unknownTokenLabel: 'Unknown token',
		unknownTokenNamedLabel: 'Unknown token ($symbol)',
		nativeSymbol: 'SOL'
	};

	describe('solTokenSymbol', () => {
		it('should prefer the token the wallet lists', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: mockValidSplToken.address,
					metadata: on({ [mockValidSplToken.address]: { name: 'Other', symbol: 'OTHER' } }),
					unknownTokenAddresses: []
				})
			).toBe(mockValidSplToken.symbol);
		});

		// One account read names a Token-2022 mint the wallet does not list, which is the whole
		// point of asking: a placeholder tells the user nothing. Its creator chose that symbol, so it
		// is shown inside the placeholder rather than as the token's name.
		it('should show the symbol the mint carries in its own account inside the placeholder', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: 'unlisted-mint',
					metadata: on({ 'unlisted-mint': { name: 'Pump', symbol: 'PUMP' } }),
					unknownTokenAddresses: []
				})
			).toBe('Unknown token (PUMP)');
		});

		// Any mint can carry the symbol of a token the wallet lists. Only the listed one reads as
		// that symbol on its own.
		it('should keep a listed symbol carried by another mint inside the placeholder', () => {
			const metadata = on({
				'other-mint': { name: mockValidSplToken.name, symbol: mockValidSplToken.symbol }
			});

			expect(
				solTokenSymbol({
					...args,
					tokenAddress: 'other-mint',
					metadata,
					unknownTokenAddresses: []
				})
			).toBe(`Unknown token (${mockValidSplToken.symbol})`);
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: mockValidSplToken.address,
					metadata,
					unknownTokenAddresses: []
				})
			).toBe(mockValidSplToken.symbol);
		});

		describe('bounding the symbol of the mint', () => {
			const symbolOf = (symbol: string) =>
				solTokenSymbol({
					...args,
					tokenAddress: 'unlisted-mint',
					metadata: on({ 'unlisted-mint': { name: 'Name', symbol } }),
					unknownTokenAddresses: []
				});

			// A zero-width space hides between letters, a bidirectional override turns what follows
			// it around, and a control character has no business in a ticker at all.
			it('should drop the characters that show nothing or reorder the rest', () => {
				expect(symbolOf('US\u200BDC\u202E\u0007')).toBe('Unknown token (USDC)');
			});

			it('should collapse and trim whitespace', () => {
				expect(symbolOf(' US \n\t DC ')).toBe('Unknown token (US DC)');
			});

			it('should keep a symbol of twelve characters whole', () => {
				expect(symbolOf('ABCDEFGHIJKL')).toBe('Unknown token (ABCDEFGHIJKL)');
			});

			it('should cut a longer symbol to twelve characters, the ellipsis included', () => {
				expect(symbolOf('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe('Unknown token (ABCDEFGHIJK…)');
			});

			it('should not end a cut symbol on a space', () => {
				expect(symbolOf('ABCDEFGHIJ KLMNOP')).toBe('Unknown token (ABCDEFGHIJ…)');
			});

			// Marks stacked onto one letter render as a single tall glyph, so counting glyphs would
			// let a symbol grow without bound.
			it('should count marks stacked onto a letter', () => {
				expect(symbolOf(`A${'\u0301'.repeat(30)}`)).toBe(
					`Unknown token (A${'\u0301'.repeat(10)}…)`
				);
			});

			it('should fall back to the bare placeholder when nothing visible is left', () => {
				expect(
					solTokenSymbol({
						...args,
						tokenAddress: 'blank-mint',
						metadata: on({ 'blank-mint': { name: 'Name', symbol: '\u200B\u202E \u0007' } }),
						unknownTokenAddresses: ['blank-mint']
					})
				).toBe('Unknown token');
			});
		});

		// The same mint address exists on several clusters and carries different data on each, so a
		// devnet mint must not inherit the name its mainnet namesake happens to have.
		it('should ignore a name held for another cluster', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: 'unlisted-mint',
					metadata: {
						[SolanaNetworks.devnet]: { 'unlisted-mint': { name: 'Pump', symbol: 'PUMP' } }
					},
					unknownTokenAddresses: ['unlisted-mint']
				})
			).toBe('Unknown token');
		});

		it('should fall back to the placeholder, unnumbered when it stands alone', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: 'nameless',
					metadata: on({}),
					unknownTokenAddresses: ['nameless']
				})
			).toBe('Unknown token');
		});

		// Two rows both reading "Unknown token" are worse than an address: nothing tells them apart.
		it('should number the placeholders when a view holds more than one', () => {
			const unknownTokenAddresses = ['first', 'second'];

			expect(
				solTokenSymbol({ ...args, tokenAddress: 'second', metadata: on({}), unknownTokenAddresses })
			).toBe('Unknown token 2');
		});

		it('should name native SOL without consulting anything', () => {
			expect(
				solTokenSymbol({
					...args,
					tokenAddress: undefined,
					metadata: on({}),
					unknownTokenAddresses: []
				})
			).toBe('SOL');
		});
	});

	// A network with no Solana cluster behind it has no names of its own, and must not be handed
	// mainnet's for want of an answer.
	it('should name nothing for a network that is not a Solana cluster', () => {
		expect(
			solTokenSymbol({
				...args,
				networkId: ETHEREUM_NETWORK_ID,
				tokenAddress: 'unlisted-mint',
				metadata: on({ 'unlisted-mint': { name: 'Pump', symbol: 'PUMP' } }),
				unknownTokenAddresses: ['unlisted-mint']
			})
		).toBe('Unknown token');
	});

	// The same mint address exists on several clusters and carries different data on each.
	it('should not lend one network name to another', () => {
		expect(
			solTokenSymbol({
				...args,
				tokenAddress: 'shared-address',
				metadata: on({}),
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
					metadata: on({ 'named-on-chain': { name: 'Pump', symbol: 'PUMP' } })
				})
			).toStrictEqual(['nameless-b', 'nameless-a']);
		});

		// The naming shows no symbol with nothing visible in it, so the counting must not treat
		// one as a name either, or two such mints would read identically.
		it('should count a mint whose own symbol has nothing visible as nameless', () => {
			expect(
				solUnknownTokenAddresses({
					tokenAddresses: ['blank-mint', 'named-on-chain'],
					tokens,
					networkId: network.id,
					metadata: on({
						'blank-mint': { name: 'Name', symbol: '\u200B ' },
						'named-on-chain': { name: 'Pump', symbol: 'PUMP' }
					})
				})
			).toStrictEqual(['blank-mint']);
		});

		// The counting reads the same per-cluster map the naming does, so it counts a mint as
		// nameless wherever no cluster of ours answers for it.
		it('should count a mint as nameless when the network is not a Solana cluster', () => {
			expect(
				solUnknownTokenAddresses({
					tokenAddresses: ['named-on-chain'],
					tokens,
					networkId: ETHEREUM_NETWORK_ID,
					metadata: on({ 'named-on-chain': { name: 'Pump', symbol: 'PUMP' } })
				})
			).toStrictEqual(['named-on-chain']);
		});
	});
});
