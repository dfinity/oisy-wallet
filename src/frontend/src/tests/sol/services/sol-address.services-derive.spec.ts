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

			const address = decoder.decode(Uint8Array.from(uint8Array));

			console.log(`SolAddress for ${network}`, foo, uint8Array, address);

			expect(address).toBe('2EQneZBEeL3XGy3YaQAgxwxYvKq2bRPfQVpiGXgpQEfv');
		});

		it('should derive the correct address for devnet', async () => {
			const network = SolanaNetworks.devnet;

			const foo = await deriveSolAddress(p, network);
			const encoder = new TextEncoder();
			const uint8Array = encoder.encode(foo);

			const address = decoder.decode(Uint8Array.from(uint8Array));

			console.log(`SolAddress for ${network}`, foo, uint8Array, address);

			expect(address).toBe('3azSdZ7u1LxpxTVE6T4oH9XuTYidD7fNhXmJKhTTczw4');
		});
	});
});
