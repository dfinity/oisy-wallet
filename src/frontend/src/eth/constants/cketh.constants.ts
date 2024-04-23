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

// As discussed with cross-chain team, we decided to hardcode gas estimation for ETH to ckETH for now.
export const CKETH_FEE = 50_000n;

// ckETH helper event signature. Immutable.
export const RECEIVED_ETH_EVENT_SIGNATURE =
	'0x257e057bb61920d8d0ed2cb7b720ac7f9c513cd1110bc9fa543079154f45f435';
// ckErc20 helper event signature. Same for all Erc20 helpers. Immutable.
export const RECEIVED_ERC20_EVENT_SIGNATURE =
	'0x4d69d0bd4287b7f66c548f90154dc81bc98f65a1b362775df5ae171a2ccd262b';
