import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens.btc.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens.env';

export const [DEFAULT_ETHEREUM_TOKEN, _rest] = SUPPORTED_ETHEREUM_TOKENS;

export const [DEFAULT_BITCOIN_TOKEN, _] = SUPPORTED_BITCOIN_TOKENS;
