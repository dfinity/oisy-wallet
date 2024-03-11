import type { Erc20Contract } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$icp-eth/constants/networks.constants';
import { LOCAL } from '$lib/constants/app.constants';

const ERC20_CONTRACT_ADDRESS_UNISWAP: Erc20Contract = {
	// Uniswap
	address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
	exchange: 'ethereum'
};

const ERC20_CONTRACTS_SEPOLIA: Erc20Contract[] = [
	{
		// Weenus
		address: '0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9',
		exchange: 'ethereum'
	},
	ERC20_CONTRACT_ADDRESS_UNISWAP
];

const _ERC20_CONTRACTS_GOERLI: Erc20Contract[] = [
	{
		// ICP
		address: '0x8c283B98Edeb405816FD1D321005dF4d3AA956ba',
		exchange: 'icp'
	},
	{
		// Weenus
		address: '0xaFF4481D10270F50f203E0763e2597776068CBc5',
		exchange: 'ethereum'
	},
	ERC20_CONTRACT_ADDRESS_UNISWAP
];

const ERC20_CONTRACTS_PRODUCTION: Erc20Contract[] = [
	{
		// ICP
		address: '0x054B8f99D15cC5B35a42a926635977d62692F25b',
		exchange: 'icp'
	},
	{
		// USDC
		address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
		exchange: 'ethereum'
	},
	{
		// USDT
		address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
		exchange: 'ethereum'
	},
	{
		// DAI
		address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
		exchange: 'ethereum'
	},
	{
		// 1INCH
		address: '0x111111111117dc0aa78b770fa6a738034120c302',
		exchange: 'ethereum'
	},
	ERC20_CONTRACT_ADDRESS_UNISWAP
];

export const ERC20_CONTRACTS: (Erc20Contract & { network: EthereumNetwork })[] = {
	...(LOCAL
		? []
		: ERC20_CONTRACTS_PRODUCTION.map((contract) => ({ ...contract, network: ETHEREUM_NETWORK }))),
	...ERC20_CONTRACTS_SEPOLIA.map((contract) => ({ ...contract, network: SEPOLIA_NETWORK }))
};

// https://ethereum.org/en/developers/docs/standards/tokens/erc-20/
export const ERC20_ABI = [
	'function name() public view returns (string)',
	'function symbol() public view returns (string)',
	'function decimals() public view returns (uint8)',
	'function totalSupply() public view returns (uint256)',
	'function balanceOf(address _owner) public view returns (uint256 balance)',
	'function transfer(address _to, uint256 _value) public returns (bool success)',
	'function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)',
	'function approve(address _spender, uint256 _value) public returns (bool success)',
	'function allowance(address _owner, address _spender) public view returns (uint256 remaining)',
	'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
	'event Approval(address indexed _owner, address indexed _spender, uint256 _value)'
];

// We assumed that ERC20 approve contract function prefix is 0x095ea7b3
// https://sepolia.etherscan.io/address/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984#writeContract#F1
export const ERC20_APPROVE_HASH = '0x095ea7b3';

// Use when UNPREDICTABLE_GAS_LIMIT error are thrown while fetching the fee data.
// See: https://docs.ethers.org/v5/troubleshooting/errors/#help-UNPREDICTABLE_GAS_LIMIT
export const ERC20_FALLBACK_FEE = 500_000n;
