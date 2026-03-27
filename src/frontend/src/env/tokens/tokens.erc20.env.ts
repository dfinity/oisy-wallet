import {
	ETH_MAINNET_ENABLED,
	ETHEREUM_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import { ONEINCH_TOKEN } from '$env/tokens/tokens-erc20/tokens.1inch.env';
import { AMDON_TOKEN } from '$env/tokens/tokens-erc20/tokens.amdon.env';
import { ARB_TOKEN } from '$env/tokens/tokens-erc20/tokens.arb.env';
import { ARMON_TOKEN } from '$env/tokens/tokens-erc20/tokens.armon.env';
import { BABAON_TOKEN } from '$env/tokens/tokens-erc20/tokens.babaon.env';
import { BIDUON_TOKEN } from '$env/tokens/tokens-erc20/tokens.biduon.env';
import { CBBTC_TOKEN } from '$env/tokens/tokens-erc20/tokens.cbbtc.env';
import { COPXON_TOKEN } from '$env/tokens/tokens-erc20/tokens.copxon.env';
import { DAI_TOKEN } from '$env/tokens/tokens-erc20/tokens.dai.env';
import { DMAIL_TOKEN } from '$env/tokens/tokens-erc20/tokens.dmail.env';
import { EEMON_TOKEN } from '$env/tokens/tokens-erc20/tokens.eemon.env';
import { EFAON_TOKEN } from '$env/tokens/tokens-erc20/tokens.efaon.env';
import { EURC_TOKEN, SEPOLIA_EURC_TOKEN } from '$env/tokens/tokens-erc20/tokens.eurc.env';
import { FLOKI_TOKEN } from '$env/tokens/tokens-erc20/tokens.floki.env';
import { IAUON_TOKEN } from '$env/tokens/tokens-erc20/tokens.iauon.env';
import { IVVON_TOKEN } from '$env/tokens/tokens-erc20/tokens.ivvon.env';
import { JASMY_TOKEN } from '$env/tokens/tokens-erc20/tokens.jasmy.env';
import { LINK_TOKEN, SEPOLIA_LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { MATIC_TOKEN } from '$env/tokens/tokens-erc20/tokens.matic.env';
import { MUON_TOKEN } from '$env/tokens/tokens-erc20/tokens.muon.env';
import { NVDAON_TOKEN } from '$env/tokens/tokens-erc20/tokens.nvdaon.env';
import { OCT_TOKEN } from '$env/tokens/tokens-erc20/tokens.oct.env';
import { PBRON_TOKEN } from '$env/tokens/tokens-erc20/tokens.pbron.env';
import { PEPE_TOKEN, SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { PEPECOIN_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepecoin.env';
import { RNDR_TOKEN } from '$env/tokens/tokens-erc20/tokens.rndr.env';
import { SHIB_TOKEN } from '$env/tokens/tokens-erc20/tokens.shib.env';
import { SLVON_TOKEN } from '$env/tokens/tokens-erc20/tokens.slvon.env';
import { SPX_TOKEN } from '$env/tokens/tokens-erc20/tokens.spx.env';
import { UNI_TOKEN } from '$env/tokens/tokens-erc20/tokens.uni.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { WBTC_TOKEN } from '$env/tokens/tokens-erc20/tokens.wbtc.env';
import { WEETH_TOKEN } from '$env/tokens/tokens-erc20/tokens.weeth.env';
import { WETH_TOKEN } from '$env/tokens/tokens-erc20/tokens.weth.env';
import { WSTETH_TOKEN } from '$env/tokens/tokens-erc20/tokens.wsteth.env';
import { XAUT_TOKEN } from '$env/tokens/tokens-erc20/tokens.xaut.env';
import { ZCHF_TOKEN } from '$env/tokens/tokens-erc20/tokens.zchf.env';
import type {
	Erc20Contract,
	RequiredAdditionalErc20Token,
	RequiredErc20Token
} from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

export const ERC20_CONTRACTS_SEPOLIA: Erc20Contract[] = [
	{
		// Weenus
		address: '0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9'
	}
];

export const ERC20_CONTRACTS_PRODUCTION: Erc20Contract[] = [];

export const ERC20_CONTRACTS: (Erc20Contract & { network: EthereumNetwork })[] = [
	...(ETH_MAINNET_ENABLED
		? ERC20_CONTRACTS_PRODUCTION.map((contract) => ({ ...contract, network: ETHEREUM_NETWORK }))
		: []),
	...ERC20_CONTRACTS_SEPOLIA.map((contract) => ({ ...contract, network: SEPOLIA_NETWORK }))
];

export const ADDITIONAL_ERC20_TOKENS: RequiredAdditionalErc20Token[] = [
	ONEINCH_TOKEN,
	AMDON_TOKEN,
	ARB_TOKEN,
	ARMON_TOKEN,
	BABAON_TOKEN,
	BIDUON_TOKEN,
	CBBTC_TOKEN,
	COPXON_TOKEN,
	DAI_TOKEN,
	DMAIL_TOKEN,
	EEMON_TOKEN,
	EFAON_TOKEN,
	FLOKI_TOKEN,
	IAUON_TOKEN,
	IVVON_TOKEN,
	JASMY_TOKEN,
	MATIC_TOKEN,
	MUON_TOKEN,
	NVDAON_TOKEN,
	PBRON_TOKEN,
	PEPECOIN_TOKEN,
	RNDR_TOKEN,
	SLVON_TOKEN,
	SPX_TOKEN,
	WEETH_TOKEN,
	WETH_TOKEN,
	ZCHF_TOKEN
];

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
