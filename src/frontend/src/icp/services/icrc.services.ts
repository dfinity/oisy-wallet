import { ICRC_TOKENS } from '$env/networks.ircrc.env';
import { metadata } from '$icp/api/icrc-ledger.api';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { IcCkInterface } from '$icp/types/ic';
import { mapIcrcToken, type IcrcLoadData } from '$icp/utils/icrc.utils';
import { queryAndUpdate, type QueryAndUpdateRequestParams } from '$lib/actors/query.ic';
import { toastsError } from '$lib/stores/toasts.store';
import { AnonymousIdentity } from '@dfinity/agent';
import { nonNullish } from '@dfinity/utils';

export const loadIcrcTokens = async (): Promise<void> => {
	const loadKnownIcrc = (data: IcCkInterface): Promise<void> =>
		queryAndUpdate<IcrcLoadData>({
			request: (params) => requestKnownIcrcData({ ...params, ...data }),
			onLoad: loadKnownIcrcData,
			onCertifiedError: ({ error: err }) => {
				icrcTokensStore.reset(data.ledgerCanisterId);

				toastsError({
					msg: { text: 'Error while loading the ICRC canisters.' },
					err
				});
			},
			identity: new AnonymousIdentity()
		});

	await Promise.all(ICRC_TOKENS.map(loadKnownIcrc));

	// TODO: extend with user defined ICRC tokens
};

const requestKnownIcrcData = async ({
	ledgerCanisterId,
	identity,
	certified,
	...rest
}: IcCkInterface & QueryAndUpdateRequestParams): Promise<IcrcLoadData> => ({
	...rest,
	ledgerCanisterId,
	metadata: await metadata({ ledgerCanisterId, identity, certified })
});

const loadKnownIcrcData = ({
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
