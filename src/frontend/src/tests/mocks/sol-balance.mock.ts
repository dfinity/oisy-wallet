import { DEVNET_EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { lamports, type Address } from '@solana/web3.js';
import { mockSolAddress } from './sol.mock';

export const mockTokenAccountResponse = {
	context: {
		slot: 353152755n
	},
	value: [
		{
			account: {
				data: {
					parsed: {
						info: {
							isNative: false,
							mint: DEVNET_EURC_TOKEN.address,
							owner: mockSolAddress,
							state: 'initialized',
							tokenAmount: {
								amount: '500000000',
								decimals: 6,
								uiAmount: 500,
								uiAmountString: '500'
							}
						},
						type: 'account'
					},
					program: 'spl-token' as Address,
					space: 165n
				},
				executable: false,
				lamports: lamports(2039280n),
				owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address,
				rentEpoch: 18446744073709551615n
			},
			pubkey: '9eo7e1YGydnzjtEm3abzboEpqicQVNBMRJFjpzotCtb1' as Address
		}
	]
};

export const mockTokenAccountResponseZeroBalance = {
	context: {
		slot: 353152755n
	},
	value: [
		{
			account: {
				data: {
					parsed: {
						info: {
							isNative: false,
							mint: DEVNET_EURC_TOKEN.address,
							owner: mockSolAddress,
							state: 'initialized',
							tokenAmount: {
								amount: '0',
								decimals: 6,
								uiAmount: 0,
								uiAmountString: '0'
							}
						},
						type: 'account'
					},
					program: 'spl-token' as Address,
					space: 165n
				},
				executable: false,
				lamports: lamports(2039280n),
				owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address,
				rentEpoch: 18446744073709551615n
			},
			pubkey: '9eo7e1YGydnzjtEm3abzboEpqicQVNBMRJFjpzotCtb1' as Address
		}
	]
};

export const mockEmptyTokenAccountResponse = {
	context: {
		slot: 353152755n
	},
	value: []
};
