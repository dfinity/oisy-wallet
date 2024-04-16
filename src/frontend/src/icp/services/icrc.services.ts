import type { UserToken } from '$declarations/backend/backend.did';
import { ICRC_TOKENS } from '$env/networks.ircrc.env';
import { metadata } from '$icp/api/icrc-ledger.api';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { IcInterface } from '$icp/types/ic';
import { mapIcrcToken, type IcrcLoadData } from '$icp/utils/icrc.utils';
import { queryAndUpdate, type QueryAndUpdateRequestParams } from '$lib/actors/query.ic';
import { listUserCustomTokens } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenCategory } from '$lib/types/token';
import { AnonymousIdentity } from '@dfinity/agent';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadIcrcTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	const loadDefaultIcrcTokens = async () => {
		await Promise.all(ICRC_TOKENS.map(loadDefaultIcrc));
	};

	const loadUserTokens = (): Promise<void> =>
		queryAndUpdate<IcrcLoadData[]>({
			request: (params) => loadUserIcrcTokens(params),
			onLoad: ({ response: tokens, certified }) =>
				tokens.forEach((token) =>
					loadIcrcData({
						response: token,
						certified
					})
				),
			onCertifiedError: ({ error: err }) => {
				toastsError({
					msg: { text: get(i18n).init.error.icrc_canisters },
					err
				});
			},
			identity
		});

	await Promise.all([loadDefaultIcrcTokens(), loadUserTokens()]);
};

const loadDefaultIcrc = (data: IcInterface): Promise<void> =>
	queryAndUpdate<IcrcLoadData>({
		request: (params) => requestDefaultIcrcData({ ...params, ...data, category: 'default' }),
		onLoad: loadIcrcData,
		onCertifiedError: ({ error: err }) => {
			icrcTokensStore.reset(data.ledgerCanisterId);

			toastsError({
				msg: { text: get(i18n).init.error.icrc_canisters },
				err
			});
		},
		identity: new AnonymousIdentity()
	});

const requestDefaultIcrcData = async ({
	ledgerCanisterId,
	identity,
	certified,
	...rest
}: IcInterface &
	QueryAndUpdateRequestParams & { category: TokenCategory }): Promise<IcrcLoadData> => ({
	...rest,
	ledgerCanisterId,
	metadata: await metadata({ ledgerCanisterId, identity, certified })
});

const loadIcrcData = ({
	response: token,
	certified
}: {
	certified: boolean;
	response: IcrcLoadData;
}) => {
	const data = mapIcrcToken(token);
	// In the unlikely event of a token not being mapped, we choose to skip it instead of throwing an error. This prevents the token from being displayed and, consequently, from being noticed as missing by the user.
	nonNullish(data) && icrcTokensStore.set({ data, certified });
};

const loadUserIcrcTokens = async (params: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<IcrcLoadData[]> => {
	const tokens = await listUserCustomTokens(params);

	return await loadUserIcrcTokensData({
		tokens,
		...params
	});
};

const loadUserIcrcTokensData = async ({
	tokens,
	certified,
	identity
}: {
	tokens: UserToken[];
	certified: boolean;
	identity: OptionIdentity;
}): Promise<IcrcLoadData[]> => {
	return await Promise.all(
		tokens
			.filter(({ enabled, token }) => enabled && 'Icrc' in token)
			.map(({ token }, i) => {
				const {
					Icrc: { ledger_id, index_id }
				} = token;

				const data: IcInterface = {
					ledgerCanisterId: ledger_id.toText(),
					indexCanisterId: index_id.toText(),
					position: ICRC_TOKENS.length + 1 + i
				};

				return data;
			})
			.map((params) =>
				requestDefaultIcrcData({ ...params, certified, identity, category: 'custom' })
			)
	);
};
