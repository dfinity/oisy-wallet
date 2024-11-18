import { EnvTokensAdditionalIcrcSchema } from '$env/schema/env-additional-icrc-token.schema';
import icrcTokens from '$env/tokens.icrc.json';

const additionalIcrcTokensParsed = EnvTokensAdditionalIcrcSchema.safeParse(icrcTokens);

export const additionalIcrcTokens = additionalIcrcTokensParsed.success
	? additionalIcrcTokensParsed.data
	: {};
