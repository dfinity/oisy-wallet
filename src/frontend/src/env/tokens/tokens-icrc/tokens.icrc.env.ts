import { ADDITIONAL_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { ICRC_CK_TOKENS, PUBLIC_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import type { IcInterface } from '$icp/types/ic-token';

export const ICRC_TOKENS: IcInterface[] = [
	...PUBLIC_ICRC_TOKENS,
	...ADDITIONAL_ICRC_TOKENS,
	...ICRC_CK_TOKENS
];
