import { deriveSolAddress } from '$lib/ic-pub-key/src/cli';
import { SolanaNetworks } from '$sol/types/network';
import { getAddressDecoder } from '@solana/kit';

describe('sol-address.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Temp tests for Solana Address Derivation', () => {
		const p = 'xlmxo-5n3p7-s56nq-7wlbe-nrvij-7veys-thk7y-uuxol-wjzki-rbcqi-aqe';

		const decoder = getAddressDecoder();

		it('should derive the correct address for mainnet', async () => {
			const network = SolanaNetworks.mainnet;

			const foo = await deriveSolAddress(p, network);
			const encoder = new TextEncoder();
			const uint8Array = encoder.encode(foo);
			const base58StringBytes = Uint8Array.from([...foo].map((c) => c.charCodeAt(0)));
			const decoder2 = getAddressDecoder();
			const bar = decoder2.decode(base58StringBytes);

			const address = decoder.decode(Uint8Array.from(uint8Array));

			console.log(`SolAddress for ${network}`, foo, base58StringBytes, uint8Array, bar, address);

			expect(address).toBe('2EQneZBEeL3XGy3YaQAgxwxYvKq2bRPfQVpiGXgpQEfv');
		});

		it('should derive the correct address for devnet', async () => {
			const network = SolanaNetworks.devnet;

			const foo = await deriveSolAddress(p, network);
			const encoder = new TextEncoder();
			const uint8Array = encoder.encode(foo);
			const base58StringBytes = Uint8Array.from([...foo].map((c) => c.charCodeAt(0)));
			const decoder2 = getAddressDecoder();
			const bar = decoder2.decode(base58StringBytes);

			const address = decoder.decode(Uint8Array.from(uint8Array));

			console.log(`SolAddress for ${network}`, foo, base58StringBytes, uint8Array, bar, address);

			expect(address).toBe('2EQneZBEeL3XGy3YaQAgxwxYvKq2bRPfQVpiGXgpQEfv');
		});
	});
});
