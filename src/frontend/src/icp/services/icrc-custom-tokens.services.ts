import { SNS_EXPLORER_URL } from '$env/explorers.env';
import { ICP_NETWORK } from '$env/networks.env';
import snsTokens from '$env/tokens.sns.json';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { icrcEnvToken, icrcEnvTokens, type IcrcEnvToken } from '$icp/types/icrc-env-token';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';

export const buildIndexedIcrcCustomTokens = (): Record<LedgerCanisterIdText, IcrcCustomToken> =>
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

export const buildIcrcCustomTokens = (): IcrcCustomToken[] => {
	try {
		const tokens = icrcEnvTokens
			.parse(
				snsTokens.map(
					({
						metadata: {
							fee: { __bigint__ },
							...rest
						},
						...ids
					}) =>
						icrcEnvToken.parse({
							...ids,
							metadata: {
								...rest,
								fee: BigInt(__bigint__)
							}
						})
				)
			)
			.map(mapIcrcCustomToken);

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
}: IcrcEnvToken): IcrcCustomToken => ({
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
