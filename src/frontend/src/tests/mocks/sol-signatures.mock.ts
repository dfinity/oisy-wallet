import { signature } from '@solana/keys';

export const mockSolSignature = () => {
	const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	let result = '';
	for (let i = 0; i < 87; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return signature(result);
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
