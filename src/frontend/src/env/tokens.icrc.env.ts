import { EnvAdditionalIcrcTokensSchema } from '$env/schema/env-additional-icrc-token.schema';
import icrcTokens from '$env/tokens.icrc.json';

const additionalIcrcTokensParsed = EnvAdditionalIcrcTokensSchema.safeParse(icrcTokens);

export const additionalIcrcTokens = additionalIcrcTokensParsed.success
	? additionalIcrcTokensParsed.data
	: {};
