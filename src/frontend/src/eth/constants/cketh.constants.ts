// Source: https://etherscan.io/address/0x7574eB42cA208A4f6960ECCAfDF186D627dCC175#code
export const CKETH_ABI = [
	{
		inputs: [{ internalType: 'address', name: '_cketh_minter_main_address', type: 'address' }],
		stateMutability: 'nonpayable',
		type: 'constructor'
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'from', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
			{ indexed: true, internalType: 'bytes32', name: 'principal', type: 'bytes32' }
		],
		name: 'ReceivedEth',
		type: 'event'
	},
	{
		inputs: [{ internalType: 'bytes32', name: '_principal', type: 'bytes32' }],
		name: 'deposit',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getMinterAddress',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	}
];

// The ckETH helper contract `deposit(bytes32)` function prefix is 0xb214faa5. It is the `deposit` of
// `CKETH_ABI` above, which converts the ETH it carries to ckETH for the principal it names.
export const CKETH_DEPOSIT_HASH = '0xb214faa5';

// As discussed with cross-chain team, we decided to hardcode gas estimation for ETH to ckETH for now.
export const CKETH_FEE = 50_000n;
