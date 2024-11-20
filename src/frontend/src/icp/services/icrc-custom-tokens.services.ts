import { SNS_EXPLORER_URL } from '$env/explorers.env';
import { ICP_NETWORK } from '$env/networks.env';
import { EnvSnsTokenSchema, EnvSnsTokensSchema } from '$env/schema/env-sns-token.schema';
import snsTokens from '$env/tokens.sns.json';
import type { EnvSnsToken } from '$env/types/env-sns-token';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenWithoutIdExtended } from '$icp/types/icrc-custom-token';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';

export const buildIndexedIcrcCustomTokens = (): Record<
	LedgerCanisterIdText,
	IcTokenWithoutIdExtended
> =>
	buildIcrcCustomTokens().reduce(
		(acc, { ledgerCanisterId, ...rest }) => ({
			...acc,
			[`${ledgerCanisterId}`]: {
				ledgerCanisterId,
				...rest
			}
		}),
		{}
	);

/**
 * @todo Add missing document and test for this function.
 */
export const buildIcrcCustomTokens = (): IcTokenWithoutIdExtended[] => {
	try {
		const tokens = EnvSnsTokensSchema.parse(
			snsTokens.map(
				({
					metadata: {
						fee: { __bigint__ },
						...rest
					},
					...ids
				}) =>
					EnvSnsTokenSchema.parse({
						...ids,
						metadata: {
							...rest,
							fee: BigInt(__bigint__)
						}
					})
			)
		).map(mapIcrcCustomToken);

		return tokens;
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).tokens.manage.error.unexpected_build },
			err
		});

		// We display an error but, continue as this is not a blocker for the runtime usage of the wallet.
		return [];
	}
};

const mapIcrcCustomToken = ({
	ledgerCanisterId,
	indexCanisterId,
	rootCanisterId,
	metadata: { name, decimals, symbol, fee, alternativeName }
}: EnvSnsToken): IcTokenWithoutIdExtended => ({
	ledgerCanisterId,
	indexCanisterId,
	network: ICP_NETWORK,
	name,
	decimals,
	symbol,
	exchangeCoinId: undefined,
	position: Number.MAX_VALUE,
	standard: 'icrc',
	category: 'custom',
	icon: `/icons/sns/${ledgerCanisterId}.png`,
	fee,
	alternativeName,
	explorerUrl: `${SNS_EXPLORER_URL}/${rootCanisterId}`
});
