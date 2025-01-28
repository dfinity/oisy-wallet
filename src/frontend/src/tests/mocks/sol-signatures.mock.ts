import { getBase58Decoder } from '@solana/codecs';
import { signature } from '@solana/keys';

export const mockSolSignature = () => {
	const randomBytes = new Uint8Array(64);
	crypto.getRandomValues(randomBytes);
	const base58 = getBase58Decoder().decode(randomBytes);
	return signature(base58);
};

export const mockSolSignatureResponse = () => ({
	signature: mockSolSignature(),
	err: null,
	confirmationStatus: 'finalized'
});

export const mockSolSignatureWithErrorResponse = () => ({
	signature: mockSolSignature(),
	err: 'Some error',
	confirmationStatus: 'finalized'
});
