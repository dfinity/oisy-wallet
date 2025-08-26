import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import crwdx from '$sol/assets/crwdx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const CRWDX_DECIMALS = 8;

export const CRWDX_SYMBOL = 'CRWDx';

export const CRWDX_TOKEN_ID: TokenId = parseTokenId(CRWDX_SYMBOL);

export const CRWDX_TOKEN: RequiredSplToken = {
	id: CRWDX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'CrowdStrike xStock',
	symbol: CRWDX_SYMBOL,
	decimals: CRWDX_DECIMALS,
	icon: crwdx,
	address: 'Xs7xXqkcK7K8urEqGg52SECi79dRp2cEKKuYjUePYDw',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
