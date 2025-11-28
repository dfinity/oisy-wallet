import { SNS_BUILTIN_TOKENS } from '$env/tokens/tokens.sns.env';
import { buildDip20Tokens } from '$icp/services/dip20-tokens.services';
import type { IcTokenExtended } from '$icp/types/icrc-custom-token';
import { parseTokenId } from '$lib/validation/token.validation';

export const IC_BUILTIN_TOKENS: IcTokenExtended[] = [
	...SNS_BUILTIN_TOKENS,
	...buildDip20Tokens()
].map((token) => ({
	...token,
	id: parseTokenId(token.symbol)
}));
