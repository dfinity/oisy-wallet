import type { EnvSnsTokenSchema } from '$env/schema/env-sns-token.schema';
import type { EnvIcrcTokenMetadataWithIcon } from '$env/types/env-icrc-token';
import type * as z from 'zod';

export type EnvSnsToken = z.infer<typeof EnvSnsTokenSchema>;

export type EnvSnsTokenWithIcon = Omit<EnvSnsToken, 'metadata'> & {
	metadata: EnvIcrcTokenMetadataWithIcon;
};
