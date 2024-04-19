// https://sepolia.etherscan.io/address/0xE1788E4834c896F1932188645cc36c54d1b80AC1#code
export const CKERC20_ABI = [
	[
		{
			inputs: [{ internalType: 'address', name: '_cketh_minter_main_address', type: 'address' }],
			stateMutability: 'nonpayable',
			type: 'constructor'
		},
		{
			anonymous: false,
			inputs: [
				{ indexed: true, internalType: 'address', name: 'erc20_contract_address', type: 'address' },
				{ indexed: true, internalType: 'address', name: 'owner', type: 'address' },
				{ indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
				{ indexed: true, internalType: 'bytes32', name: 'principal', type: 'bytes32' }
			],
			name: 'ReceivedErc20',
			type: 'event'
		},
		{
			inputs: [
				{ internalType: 'address', name: 'erc20_address', type: 'address' },
				{ internalType: 'uint256', name: 'amount', type: 'uint256' },
				{ internalType: 'bytes32', name: 'principal', type: 'bytes32' }
			],
			name: 'deposit',
			outputs: [],
			stateMutability: 'nonpayable',
			type: 'function'
		},
		{
			inputs: [],
			name: 'getMinterAddress',
			outputs: [{ internalType: 'address', name: '', type: 'address' }],
			stateMutability: 'view',
			type: 'function'
		}
	]
];
