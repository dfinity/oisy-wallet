import icrcTokens from '$env/tokens.icrc.json';
import { envTokensAdditionalIcrc } from '$env/types/env-token-icrc-additional';

const icrc = envTokensAdditionalIcrc.safeParse(icrcTokens);

export const { production: additionalIcrcProduction, staging: additionalIcrcStaging } = icrc.success
	? icrc.data
	: { production: {}, staging: {} };
