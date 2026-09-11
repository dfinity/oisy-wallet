import type { SolSignature } from '$sol/types/sol-transaction';
import { getBase58Decoder, signature, type UnixTimestamp } from '@solana/kit';

export const mockSolSignature = () => {
	const randomBytes = new Uint8Array(64);
	crypto.getRandomValues(randomBytes);
	const base58 = getBase58Decoder().decode(randomBytes);
	return signature(base58);
};

export const mockSolSignatureResponse = (overrides: Partial<SolSignature> = {}): SolSignature => ({
	signature: mockSolSignature(),
	err: null,
	confirmationStatus: 'finalized',
	blockTime: 1234567890n as UnixTimestamp,
	slot: 1234567890n,
	memo: 'Some memo',
	...overrides
});

export const mockSolSignatureResponsesAtSlots = (slots: bigint[]): SolSignature[] =>
	slots.map((slot) => mockSolSignatureResponse({ slot }));

export const mockSolSignatureWithErrorResponse = () => ({
	signature: mockSolSignature(),
	err: 'Some error',
	confirmationStatus: 'finalized'
});
