import { SUPPORTED_ARBITRUM_TOKENS } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { SUPPORTED_BASE_TOKENS } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { SUPPORTED_BSC_TOKENS } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { SUPPORTED_POLYGON_TOKENS } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';

export const [DEFAULT_ETHEREUM_TOKEN] = SUPPORTED_ETHEREUM_TOKENS;

export const [DEFAULT_BITCOIN_TOKEN] = SUPPORTED_BITCOIN_TOKENS;

export const [DEFAULT_SOLANA_TOKEN] = SUPPORTED_SOLANA_TOKENS;

export const [DEFAULT_BSC_TOKEN] = SUPPORTED_BSC_TOKENS;

export const [DEFAULT_BASE_TOKEN] = SUPPORTED_BASE_TOKENS;

export const [DEFAULT_POLYGON_TOKEN] = SUPPORTED_POLYGON_TOKENS;

export const [DEFAULT_ARBITRUM_TOKEN] = SUPPORTED_ARBITRUM_TOKENS;
