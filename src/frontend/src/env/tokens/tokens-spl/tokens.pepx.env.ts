import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import pepx from '$sol/assets/pepx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const PEPX_DECIMALS = 8;

export const PEPX_SYMBOL = 'PEPx';

export const PEPX_TOKEN_ID: TokenId = parseTokenId(PEPX_SYMBOL);

export const PEPX_TOKEN: RequiredSpl2022Token = {
	id: PEPX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'PepsiCo xStock',
	symbol: PEPX_SYMBOL,
	decimals: PEPX_DECIMALS,
	icon: pepx,
	address: 'Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
