import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import { ETH_MAINNET_ENABLED } from '$env/networks.eth.env';
import type { Erc20Contract, RequiredErc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import usdc from '$icp-eth/assets/usdc.svg';
import type { TokenId } from '$lib/types/token';

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

export const ERC20_CONTRACT_ICP_GOERLI: Erc20Contract = {
	// ICP
	address: '0x8c283B98Edeb405816FD1D321005dF4d3AA956ba',
	exchange: 'icp'
};

const _ERC20_CONTRACTS_GOERLI: Erc20Contract[] = [
	ERC20_CONTRACT_ICP_GOERLI,
	{
		// Weenus
		address: '0xaFF4481D10270F50f203E0763e2597776068CBc5',
		exchange: 'ethereum'
	},
	ERC20_CONTRACT_ADDRESS_UNISWAP
];

export const ERC20_CONTRACT_ICP: Erc20Contract = {
	// ICP
	address: '0x054B8f99D15cC5B35a42a926635977d62692F25b',
	exchange: 'icp'
};

const ERC20_CONTRACTS_PRODUCTION: Erc20Contract[] = [
	ERC20_CONTRACT_ICP,
	// TODO: remove when enabling USD_TOKEN with twin token support
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

export const ERC20_CONTRACTS: (Erc20Contract & { network: EthereumNetwork })[] = [
	...(ETH_MAINNET_ENABLED
		? ERC20_CONTRACTS_PRODUCTION.map((contract) => ({ ...contract, network: ETHEREUM_NETWORK }))
		: []),
	...ERC20_CONTRACTS_SEPOLIA.map((contract) => ({ ...contract, network: SEPOLIA_NETWORK }))
];

/**
 * ERC20 which have twin tokens counterparts.
 * Because we manage those with ckERC20, we describe their details statically for simplicity reason.
 * Unlike other Erc20 tokens, for which we load the details at runtime based one their contract address.
 */

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: unique symbol = Symbol(USDC_SYMBOL);

export const USDC_TOKEN: RequiredErc20Token = {
	id: USDC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USD Coin',
	symbol: 'USDC',
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
	exchange: 'erc20',
	twinTokenSymbol: 'ckUSDC'
};

export const SEPOLIA_USDC_SYMBOL = 'SepoliaUSDC';

export const SEPOLIA_USDC_TOKEN_ID: unique symbol = Symbol(SEPOLIA_USDC_SYMBOL);

export const SEPOLIA_USDC_TOKEN: RequiredErc20Token = {
	id: SEPOLIA_USDC_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USDC',
	symbol: 'USDC',
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaUSDC'
};

const ERC20_TWIN_TOKENS_SEPOLIA: RequiredErc20Token[] = [SEPOLIA_USDC_TOKEN];

export const ERC20_TWIN_TOKENS: RequiredErc20Token[] = [
	// TODO: uncomment to enable USD_TOKEN with twin token support
	// TODO: do not forget to removed USD_TOKEN in ERC20_CONTRACTS_PRODUCTION
	// ...(ETH_MAINNET_ENABLED ? [USDC_TOKEN] : []),
	...(ETH_MAINNET_ENABLED ? [] : []),
	...ERC20_TWIN_TOKENS_SEPOLIA
];

export const ERC20_TWIN_TOKENS_IDS: TokenId[] = ERC20_TWIN_TOKENS.map(({ id }) => id);
