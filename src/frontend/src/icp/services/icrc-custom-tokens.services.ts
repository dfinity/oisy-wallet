import { SNS_EXPLORER_URL } from '$env/explorers.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { EnvSnsTokenSchema, EnvSnsTokensSchema } from '$env/schema/env-sns-token.schema';
import snsTokens from '$env/tokens/tokens.sns.json';
import type { EnvSnsToken } from '$env/types/env-sns-token';
import type { IcTokenWithoutId } from '$icp/types/ic-token';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

/**
 * @todo Add missing document and test for this function.
 */
export const buildIcrcCustomTokens = (): IcTokenWithoutId[] => {
	try {
		return EnvSnsTokensSchema.parse(
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
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).tokens.manage.error.unexpected_build },
			err
		});

		// We display an error but continue as this is not a blocker for the runtime usage of the wallet.
		return [];
	}
};

const mapIcrcCustomToken = ({
	ledgerCanisterId,
	indexCanisterId,
	rootCanisterId,
	governanceCanisterId,
	metadata: { name, decimals, symbol, fee, alternativeName },
	deprecated
}: EnvSnsToken): IcTokenWithoutId => ({
	ledgerCanisterId,
	indexCanisterId,
	mintingAccount: getIcrcAccount(Principal.fromText(governanceCanisterId)),
	network: ICP_NETWORK,
	name,
	decimals,
	symbol,
	exchangeCoinId: undefined,
	standard: { code: 'icrc' },
	category: 'custom',
	fee,
	alternativeName,
	explorerUrl: `${SNS_EXPLORER_URL}/${rootCanisterId}`,
	deprecated,
	...(deprecated !== true && { icon: `/icons/sns/${ledgerCanisterId}.png` })
});
