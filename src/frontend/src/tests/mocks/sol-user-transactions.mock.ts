import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockSignature } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { signature } from '@solana/kit';

export const mockSolUserTransactionId = `${mockSignature}-0-programId`;

export const mockSolUserTransactionUi: SolTransactionUi = {
	id: mockSolUserTransactionId,
	signature: signature(mockSignature),
	blockNumber: 12345,
	timestamp: 1700000000n,
	from: mockSolAddress,
	to: mockSolAddress2,
	value: 5000n,
	type: 'send',
	status: 'finalized',
	fee: 5000n,
	fromOwner: 'owner1',
	toOwner: 'owner2'
};

export const mockSolNativeMainnetTokenId: BackendTokenId = { SolNativeMainnet: null };
