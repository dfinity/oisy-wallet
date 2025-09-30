import { EnvAdditionalIcrcTokensSchema } from '$env/schema/env-additional-icrc-token.schema';
import icrcTokens from '$env/tokens/tokens.icrc.json';

const additionalIcrcTokensParsed = EnvAdditionalIcrcTokensSchema.safeParse(
	Object.entries(icrcTokens).reduce(
		(
			acc,
			[
				key,
				{
					fee: { __bigint__ },
					...rest
				}
			]
		) => ({ ...acc, [key]: { ...rest, fee: BigInt(__bigint__) } }),
		{}
	)
);

export const additionalIcrcTokens = additionalIcrcTokensParsed.success
	? additionalIcrcTokensParsed.data
	: {};
