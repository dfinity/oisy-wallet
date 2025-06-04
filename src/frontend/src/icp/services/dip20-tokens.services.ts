import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { EnvDip20TokenSchema, EnvDip20TokensSchema } from '$env/schema/env-dip20-token.schema';
import dip20Tokens from '$env/tokens/tokens.dip20.json';
import type { EnvDip20Token } from '$env/types/env-dip20-token';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenWithoutIdExtended } from '$icp/types/icrc-custom-token';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';

export const buildIndexedDip20Tokens = (): Record<LedgerCanisterIdText, IcTokenWithoutIdExtended> =>
	buildDip20Tokens().reduce(
		(acc, { ledgerCanisterId, ...rest }) => ({
			...acc,
			[`${ledgerCanisterId}`]: {
				ledgerCanisterId,
				...rest
			}
		}),
		{}
	);

export const buildDip20Tokens = (): IcTokenWithoutIdExtended[] => {
	try {
		return EnvDip20TokensSchema.parse(
			dip20Tokens.map(
				({
					metadata: {
						fee: { __bigint__ },
						...rest
					},
					...ids
				}) =>
					EnvDip20TokenSchema.parse({
						...ids,
						metadata: {
							...rest,
							fee: BigInt(__bigint__)
						}
					})
			)
		).map(mapDip20Token);
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).tokens.manage.error.unexpected_build },
			err
		});

		// We display an error but, continue as this is not a blocker for the runtime usage of the wallet.
		return [];
	}
};

const mapDip20Token = ({
	ledgerCanisterId,
	metadata: { name, decimals, symbol, fee, alternativeName }
}: EnvDip20Token): IcTokenWithoutIdExtended => ({
	ledgerCanisterId,
	network: ICP_NETWORK,
	name,
	decimals,
	symbol,
	exchangeCoinId: undefined,
	position: Number.MAX_VALUE,
	standard: 'dip20',
	category: 'custom',
	fee,
	alternativeName,
	icon: `/icons/dip20/${ledgerCanisterId}.png`
});
