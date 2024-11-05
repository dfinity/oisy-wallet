import ckErc20Tokens from '$env/tokens.ckerc20.json';
import { envTokensCkErc20 } from '$env/types/env-token-ckerc20';
import { safeParse } from '$lib/validation/utils.validation';

export const { production: ckErc20Production, staging: ckErc20Staging } = safeParse({
	schema: envTokensCkErc20,
	value: ckErc20Tokens,
	fallback: { production: {}, staging: {} }
});
