import type { Erc20ContractAddress } from '$lib/types/erc20';

// TODO: extract environment file(s)?
export const ERC20_CONTRACTS_ADDRESSES_DEVELOPMENT: Erc20ContractAddress[] = [
	{
		// Weenus
		address: '0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9'
	},
	{
		// Uniswap
		address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
	}
];

export const ERC20_CONTRACTS_ADDRESSES_PRODUCTION: Erc20ContractAddress[] = [
	{
		// USDC
		address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
	},
	{
		// USDT
		address: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
	},
	{
		// DAI
		address: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
	}
];

export const ERC20_CONTRACTS_ADDRESSES: Erc20ContractAddress[] =
	import.meta.env.MODE === 'production'
		? ERC20_CONTRACTS_ADDRESSES_PRODUCTION
		: ERC20_CONTRACTS_ADDRESSES_DEVELOPMENT;

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
