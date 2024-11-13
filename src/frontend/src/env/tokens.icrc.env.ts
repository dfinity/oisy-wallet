import { EnvTokensAdditionalIcrcSchema } from '$env/schema/env-additional-icrc-token.schema';
import icrcTokens from '$env/tokens.icrc.json';

const additionalIcrcTokens = EnvTokensAdditionalIcrcSchema.safeParse(icrcTokens);

export const { production: additionalIcrcTokensProduction, staging: additionalIcrcTokensStaging } =
	additionalIcrcTokens.success ? additionalIcrcTokens.data : { production: {}, staging: {} };
