import snsTokens from '$env/tokens.sns.json';
import { PROD, STAGING } from '$lib/constants/app.constants';
import { z } from 'zod';

const knownIcrcToken = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string(),
	metadata: z.object({
		decimals: z.number(),
		name: z.string(),
		symbol: z.string(),
		fee: z.bigint()
	})
});

const knownIcrcTokens = z.array(knownIcrcToken);

type KnownIcrcTokens = z.infer<typeof knownIcrcTokens>;

export const KNOWN_ICRC_TOKENS: KnownIcrcTokens = knownIcrcTokens.parse(
	STAGING || PROD
		? [
				knownIcrcToken.parse(
					snsTokens.map(
						({
							metadata: {
								fee: { __bigint__ },
								...rest
							},
							...ids
						}) => ({
							...ids,
							metadata: {
								...rest,
								fee: BigInt(__bigint__)
							}
						})
					)
				)
			]
		: []
);
