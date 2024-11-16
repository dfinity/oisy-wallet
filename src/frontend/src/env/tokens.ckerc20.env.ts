import { EnvTokensCkErc20Schema } from '$env/schema/env-token-ckerc20.schema';
import ckErc20Tokens from '$env/tokens.ckerc20.json';
import { safeParse } from '$lib/validation/utils.validation';

export const { production: ckErc20Production, staging: ckErc20Staging } = safeParse({
	schema: EnvTokensCkErc20Schema,
	value: ckErc20Tokens,
	fallback: { production: {}, staging: {} }
});
