import {
	ETH_MAINNET_ENABLED,
	ETHEREUM_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import { ONEINCH_TOKEN } from '$env/tokens/tokens-erc20/tokens.1inch.env';
import { EURC_TOKEN, SEPOLIA_EURC_TOKEN } from '$env/tokens/tokens-erc20/tokens.eurc.env';
import { JASMY_TOKEN } from '$env/tokens/tokens-erc20/tokens.jasmy.env';
import { LINK_TOKEN, SEPOLIA_LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { OCT_TOKEN } from '$env/tokens/tokens-erc20/tokens.oct.env';
import { PEPE_TOKEN, SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { SHIB_TOKEN } from '$env/tokens/tokens-erc20/tokens.shib.env';
import { UNI_TOKEN } from '$env/tokens/tokens-erc20/tokens.uni.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { WBTC_TOKEN } from '$env/tokens/tokens-erc20/tokens.wbtc.env';
import { WSTETH_TOKEN } from '$env/tokens/tokens-erc20/tokens.wsteth.env';
import { XAUT_TOKEN } from '$env/tokens/tokens-erc20/tokens.xaut.env';
import type {
	Erc20Contract,
	RequiredAdditionalErc20Token,
	RequiredErc20Token
} from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

// TODO: remember to remove the ERC20 from here once the ckERC20 is implemented. Following the normal flow, the ERC20 variables should be created on a separate file.

const ERC20_CONTRACT_ADDRESS_DMAIL: Erc20Contract = {
	// Dmail Network
	address: '0xcC6f1e1B87cfCbe9221808d2d85C501aab0B5192',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_MATIC: Erc20Contract = {
	// Polygon
	address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
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

const ERC20_CONTRACT_ADDRESS_WEEETH: Erc20Contract = {
	// Wrapped Ether (weETH)
	address: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
	exchange: 'erc20'
};

const ERC20_CONTRACT_ADDRESS_WETH: Erc20Contract = {
	// Wrapped Ether (WETH)
	address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
	exchange: 'erc20'
};

export const ERC20_CONTRACTS_SEPOLIA: Erc20Contract[] = [
	{
		// Weenus
		address: '0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9',
		exchange: 'erc20'
	}
];

export const ERC20_CONTRACT_ICP_GOERLI: Erc20Contract = {
	// ICP
	address: '0x8c283B98Edeb405816FD1D321005dF4d3AA956ba',
	exchange: 'icp'
};

export const ERC20_CONTRACT_ICP: Erc20Contract = {
	// ICP
	address: '0x054B8f99D15cC5B35a42a926635977d62692F25b',
	exchange: 'icp'
};

export const ERC20_CONTRACTS_PRODUCTION: Erc20Contract[] = [
	ERC20_CONTRACT_ICP,
	ERC20_CONTRACT_ADDRESS_DMAIL,
	ERC20_CONTRACT_ADDRESS_MATIC,
	ERC20_CONTRACT_ADDRESS_DAI,
	ERC20_CONTRACT_ADDRESS_FLOKI,
	ERC20_CONTRACT_ADDRESS_RNDR,
	ERC20_CONTRACT_ADDRESS_WEEETH,
	ERC20_CONTRACT_ADDRESS_WETH
];

export const ERC20_CONTRACTS: (Erc20Contract & { network: EthereumNetwork })[] = [
	...(ETH_MAINNET_ENABLED
		? ERC20_CONTRACTS_PRODUCTION.map((contract) => ({ ...contract, network: ETHEREUM_NETWORK }))
		: []),
	...ERC20_CONTRACTS_SEPOLIA.map((contract) => ({ ...contract, network: SEPOLIA_NETWORK }))
];

export const ADDITIONAL_ERC20_TOKENS: RequiredAdditionalErc20Token[] = [ONEINCH_TOKEN, JASMY_TOKEN];

/**
 * ERC20 which have twin tokens counterparts.
 * Because we manage those with ckERC20, we describe their details statically for simplicity reason.
 * Unlike other Erc20 tokens, for which we load the details at runtime based one their contract address.
 */

export const ERC20_TWIN_TOKENS_SEPOLIA: RequiredErc20Token[] = [
	SEPOLIA_USDC_TOKEN,
	SEPOLIA_EURC_TOKEN,
	SEPOLIA_LINK_TOKEN,
	SEPOLIA_PEPE_TOKEN
];

export const ERC20_TWIN_TOKENS_MAINNET: RequiredErc20Token[] = [
	USDC_TOKEN,
	LINK_TOKEN,
	PEPE_TOKEN,
	OCT_TOKEN,
	SHIB_TOKEN,
	WBTC_TOKEN,
	USDT_TOKEN,
	WSTETH_TOKEN,
	UNI_TOKEN,
	EURC_TOKEN,
	XAUT_TOKEN
];

export const ERC20_TWIN_TOKENS: RequiredErc20Token[] = defineSupportedTokens({
	mainnetFlag: ETH_MAINNET_ENABLED,
	mainnetTokens: ERC20_TWIN_TOKENS_MAINNET,
	testnetTokens: ERC20_TWIN_TOKENS_SEPOLIA
});

export const ERC20_TWIN_TOKENS_IDS: TokenId[] = ERC20_TWIN_TOKENS.map(({ id }) => id);

// Suggested tokens to be enabled by default if the user set no preference
export const ERC20_SUGGESTED_TOKENS = [USDT_TOKEN, USDC_TOKEN];
