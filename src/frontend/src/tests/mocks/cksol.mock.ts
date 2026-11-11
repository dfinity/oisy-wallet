import { getBase58Decoder, getBase58Encoder } from '@solana/kit';

// The signature of a Solana transaction, 64 bytes.
export const mockCkSolSweepSignatureBytes = new Uint8Array(64).fill(0xab);

export const mockCkSolSweepSignature = getBase58Decoder().decode(mockCkSolSweepSignatureBytes);

// A ckSOL mint memo, byte for byte as the minter's minicbor derive writes it: the memo enum and
// the array holding its one field, the mint enum and the array holding its two fields, the
// 64-byte string of the sweep's signature, then the deposit id (7, a one-byte integer).
export const mockCkSolMintMemo = (
	signature: Uint8Array = mockCkSolSweepSignatureBytes
): Uint8Array =>
	Uint8Array.from([0x82, 0x00, 0x81, 0x82, 0x01, 0x82, 0x58, 0x40, ...signature, 0x07]);

// A ckSOL burn memo, byte for byte as the minter's minicbor derive writes it: the memo enum and
// the array holding its one field, the burn enum and the array holding its one field, then the
// 32-byte string of the Solana address.
export const mockCkSolBurnMemo = (address: string): Uint8Array =>
	Uint8Array.from([
		0x82,
		0x01,
		0x81,
		0x82,
		0x00,
		0x81,
		0x58,
		0x20,
		...getBase58Encoder().encode(address)
	]);
