import { DIP20_BUILTIN_TOKENS } from '$env/tokens/tokens.dip20.env';
import { SNS_BUILTIN_TOKENS } from '$env/tokens/tokens.sns.env';
import type { IcToken } from '$icp/types/ic-token';
import { parseTokenId } from '$lib/validation/token.validation';

export const IC_BUILTIN_TOKENS: IcToken[] = [...SNS_BUILTIN_TOKENS, ...DIP20_BUILTIN_TOKENS].map(
	(token) => ({
		...token,
		id: parseTokenId(token.symbol)
	})
);
