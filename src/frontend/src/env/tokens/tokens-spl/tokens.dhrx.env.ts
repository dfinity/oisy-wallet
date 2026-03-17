import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import dhrx from '$sol/assets/dhrx.svg';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const DHRX_DECIMALS = 8;

export const DHRX_SYMBOL = 'DHRx';

export const DHRX_TOKEN_ID: TokenId = parseTokenId(DHRX_SYMBOL);

export const DHRX_TOKEN: RequiredSpl2022Token = {
	id: DHRX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Danaher xStock',
	symbol: DHRX_SYMBOL,
	decimals: DHRX_DECIMALS,
	icon: dhrx,
	address: 'Xseo8tgCZfkHxWS9xbFYeKFyMSbWEvZGFV1Gh53GtCV',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
