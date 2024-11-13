import icrcTokens from '$env/tokens.icrc.json';
import { envTokensAdditionalIcrc } from '$env/types/env-icrc-token';

const additionalIcrcTokens = envTokensAdditionalIcrc.safeParse(icrcTokens);

export const { production: additionalIcrcTokensProduction, staging: additionalIcrcTokensStaging } =
	additionalIcrcTokens.success ? additionalIcrcTokens.data : { production: {}, staging: {} };
