import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import qqqx from '$sol/assets/qqqx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const QQQX_DECIMALS = 8;

export const QQQX_SYMBOL = 'QQQx';

export const QQQX_TOKEN_ID: TokenId = parseTokenId(QQQX_SYMBOL);

export const QQQX_TOKEN: RequiredSpl2022Token = {
	id: QQQX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Nasdaq xStock',
	symbol: QQQX_SYMBOL,
	decimals: QQQX_DECIMALS,
	icon: qqqx,
	address: 'Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
