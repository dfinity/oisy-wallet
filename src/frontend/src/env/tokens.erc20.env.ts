import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import { ETH_MAINNET_ENABLED } from '$env/networks.eth.env';
import { LINK_TOKEN, SEPOLIA_LINK_TOKEN } from '$env/tokens-erc20/tokens.link.env';
import { OCT_TOKEN } from '$env/tokens-erc20/tokens.oct.env';
import { PEPE_TOKEN, SEPOLIA_PEPE_TOKEN } from '$env/tokens-erc20/tokens.pepe.env';
import { SHIB_TOKEN } from '$env/tokens-erc20/tokens.shib.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens-erc20/tokens.usdc.env';
import { WBTC_TOKEN } from '$env/tokens-erc20/tokens.wbtc.env';
import type { Erc20Contract, RequiredErc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import type { TokenId } from '$lib/types/token';

// TODO: remember to remove the ERC20 from here once the ckERC20 is implemented. Following the normal flow, the ERC20 variables should be created on a separate file.

const ERC20_CONTRACT_ADDRESS_1INCH: Erc20Contract = {
	// 1INCH
	address: '0x111111111117dc0aa78b770fa6a738034120c302',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_WBTC: Erc20Contract = {
	// Wrapped Bitcoin
	address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_WSTETH: Erc20Contract = {
	// Lido Finance (wstETH)
	address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_USDT: Erc20Contract = {
	// Tether
	address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_DMAIL: Erc20Contract = {
	// Dmail Network
	address: '0xcC6f1e1B87cfCbe9221808d2d85C501aab0B5192',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_UNISWAP: Erc20Contract = {
	// Uniswap
	address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_MATIC: Erc20Contract = {
	// Polygon
	address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_JASMY: Erc20Contract = {
	// Jasmy
	address: '0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_DAI: Erc20Contract = {
	// Multi-Collateral DAI
	address: '0x6b175474e89094c44da98b954eedeac495271d0f',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_FLOKI: Erc20Contract = {
	// Floki Inu
	address: '0xcf0c122c6b73ff809c693db761e7baebe62b6a2e',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_RNDR: Erc20Contract = {
	// Render
	address: '0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_FET: Erc20Contract = {
	// Fetch
	address: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_WEEETH: Erc20Contract = {
	// Wrapped Ether (weETH)
	address: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
	exchange: 'erc20'
};

const ERC20_CONTRACTS_SEPOLIA: Erc20Contract[] = [
	{
		// Weenus
		address: '0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9',
		exchange: 'erc20'
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
		exchange: 'erc20'
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
	ERC20_CONTRACT_ADDRESS_1INCH,
	ERC20_CONTRACT_ADDRESS_WBTC,
	ERC20_CONTRACT_ADDRESS_WSTETH,
	ERC20_CONTRACT_ADDRESS_USDT,
	ERC20_CONTRACT_ADDRESS_DMAIL,
	ERC20_CONTRACT_ADDRESS_UNISWAP,
	ERC20_CONTRACT_ADDRESS_MATIC,
	ERC20_CONTRACT_ADDRESS_JASMY,
	ERC20_CONTRACT_ADDRESS_DAI,
	ERC20_CONTRACT_ADDRESS_FLOKI,
	ERC20_CONTRACT_ADDRESS_RNDR,
	ERC20_CONTRACT_ADDRESS_FET,
	ERC20_CONTRACT_ADDRESS_WEEETH
];

export const ERC20_CONTRACTS: (Erc20Contract & { network: EthereumNetwork })[] = [
	...(ETH_MAINNET_ENABLED
		? ERC20_CONTRACTS_PRODUCTION.map((contract) => ({ ...contract, network: ETHEREUM_NETWORK }))
		: []),
	...ERC20_CONTRACTS_SEPOLIA.map((contract) => ({ ...contract, network: SEPOLIA_NETWORK }))
];

export const ERC20_CONTRACTS_ADDRESSES = ERC20_CONTRACTS.map(({ address }) =>
	mapAddressStartsWith0x(address).toLowerCase()
);

/**
 * ERC20 which have twin tokens counterparts.
 * Because we manage those with ckERC20, we describe their details statically for simplicity reason.
 * Unlike other Erc20 tokens, for which we load the details at runtime based one their contract address.
 */

const ERC20_TWIN_TOKENS_SEPOLIA: RequiredErc20Token[] = [
	SEPOLIA_USDC_TOKEN,
	SEPOLIA_LINK_TOKEN,
	SEPOLIA_PEPE_TOKEN
];

const ERC20_TWIN_TOKENS_MAINNET: RequiredErc20Token[] = [
	USDC_TOKEN,
	LINK_TOKEN,
	PEPE_TOKEN,
	OCT_TOKEN,
	SHIB_TOKEN,
	WBTC_TOKEN
];

export const ERC20_TWIN_TOKENS: RequiredErc20Token[] = [
	...(ETH_MAINNET_ENABLED ? ERC20_TWIN_TOKENS_MAINNET : []),
	...ERC20_TWIN_TOKENS_SEPOLIA
];

export const ERC20_TWIN_TOKENS_IDS: TokenId[] = ERC20_TWIN_TOKENS.map(({ id }) => id);
