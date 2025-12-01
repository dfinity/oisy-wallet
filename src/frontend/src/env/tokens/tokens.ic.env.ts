import { DIP20_BUILTIN_TOKENS } from '$env/tokens/tokens.dip20.env';
import { SNS_BUILTIN_TOKENS } from '$env/tokens/tokens.sns.env';
import type { IcTokenExtended } from '$icp/types/icrc-custom-token';
import { parseTokenId } from '$lib/validation/token.validation';

export const IC_BUILTIN_TOKENS: IcTokenExtended[] = [
	...SNS_BUILTIN_TOKENS,
	...DIP20_BUILTIN_TOKENS
].map((token) => ({
	...token,
	id: parseTokenId(token.symbol)
}));
