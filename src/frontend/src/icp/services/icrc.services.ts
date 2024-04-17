import type { CustomToken } from '$declarations/backend/backend.did';
import { ICRC_TOKENS } from '$env/networks.ircrc.env';
import { metadata } from '$icp/api/icrc-ledger.api';
import { buildIndexedIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import type { IcInterface } from '$icp/types/ic';
import { mapIcrcToken, type IcrcLoadData } from '$icp/utils/icrc.utils';
import { queryAndUpdate, type QueryAndUpdateRequestParams } from '$lib/actors/query.ic';
import { listCustomTokens } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenCategory } from '$lib/types/token';
import { AnonymousIdentity } from '@dfinity/agent';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadIcrcTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	await Promise.all([loadDefaultIcrcTokens(), loadUserTokens({ identity })]);
};

const loadDefaultIcrcTokens = async () => {
	await Promise.all(ICRC_TOKENS.map(loadDefaultIcrc));
};

export const loadUserTokens = ({ identity }: { identity: OptionIdentity }): Promise<void> =>
	queryAndUpdate<IcrcLoadData[]>({
		request: (params) => loadCustomIcrcTokens(params),
		onLoad: loadCustomIcrcData,
		onCertifiedError: ({ error: err }) => {
			toastsError({
				msg: { text: get(i18n).init.error.icrc_canisters },
				err
			});
		},
		identity
	});

const loadDefaultIcrc = (data: IcInterface): Promise<void> =>
	queryAndUpdate<IcrcLoadData>({
		request: (params) => requestIcrcMetadata({ ...params, ...data, category: 'default' }),
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

const requestIcrcMetadata = async ({
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

const loadCustomIcrcTokens = async (params: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<IcrcLoadData[]> => {
	const tokens = await listCustomTokens(params);

	const icrcDefaultLedgerIds = ICRC_TOKENS.map(({ ledgerCanisterId }) => ledgerCanisterId);

	// We filter the custom tokens that are enabled and Icrc, but also not part of the default tokens of Oisy.
	// For example, and for some reason, a user might manually add the ckBTC ledger and index canister again to their list of tokens.
	// Not an issue per se, but given that the list of tokens is sorted, one token might move, which equals a visual glitch.
	const icrcTokens = tokens.filter(
		({ enabled, token }) =>
			enabled && 'Icrc' in token && !icrcDefaultLedgerIds.includes(token.Icrc.ledger_id.toText())
	);

	return await loadCustomIcrcTokensData({
		tokens: icrcTokens,
		...params
	});
};

const loadCustomIcrcTokensData = async ({
	tokens,
	certified,
	identity
}: {
	tokens: CustomToken[];
	certified: boolean;
	identity: OptionIdentity;
}): Promise<IcrcLoadData[]> => {
	return await Promise.all(
		tokens
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
			.map((params) => requestIcrcMetadata({ ...params, certified, identity, category: 'custom' }))
	);
};

const loadCustomIcrcData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: IcrcLoadData[];
}) => {
	const icrcCustomTokens = buildIndexedIcrcCustomTokens();

	tokens.forEach((token) =>
		loadIcrcData({
			response: {
				...token,
				icrcCustomTokens
			},
			certified
		})
	);
};
