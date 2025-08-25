import type { CustomToken } from '$declarations/backend/backend.did';
import { ICRC_TOKENS, PUBLIC_ICRC_TOKENS } from '$env/networks.icrc.env';
import { metadata } from '$icp/api/icrc-ledger.api';
import { buildIndexedIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcInterface } from '$icp/types/ic';
import type { IcrcCustomTokenWithoutId } from '$icp/types/icrc-custom-token';
import {
	buildIcrcCustomTokenMetadataPseudoResponse,
	mapIcrcToken,
	type IcrcLoadData
} from '$icp/utils/icrc.utils';
import {
	queryAndUpdate,
	type QueryAndUpdateRequestParams,
	type QueryAndUpdateStrategy
} from '$lib/actors/query.ic';
import { listCustomTokens } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenCategory } from '$lib/types/token';
import { AnonymousIdentity } from '@dfinity/agent';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadIcrcTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	await Promise.all([loadDefaultIcrcTokens(), loadCustomTokens({ identity })]);
};

export const unsafeLoadDefaultPublicIcrcTokens = async () => {
	await Promise.all(
		PUBLIC_ICRC_TOKENS.map((token) => loadDefaultIcrc({ data: token, strategy: 'query' }))
	);
};

const loadDefaultIcrcTokens = async () => {
	await Promise.all(ICRC_TOKENS.map((token) => loadDefaultIcrc({ data: token })));
};

export const loadCustomTokens = ({ identity }: { identity: OptionIdentity }): Promise<void> =>
	queryAndUpdate<IcrcCustomTokenWithoutId[]>({
		request: (params) => loadIcrcCustomTokens(params),
		onLoad: loadIcrcCustomData,
		onCertifiedError: ({ error: err }) => {
			icrcCustomTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.icrc_canisters },
				err
			});
		},
		identity
	});

export const loadDefaultIcrc = ({
	data,
	strategy
}: {
	data: IcInterface;
	strategy?: QueryAndUpdateStrategy;
}): Promise<void> =>
	queryAndUpdate<IcrcLoadData>({
		request: (params) => requestIcrcMetadata({ ...params, ...data, category: 'default' }),
		onLoad: loadIcrcData,
		onCertifiedError: ({ error: err }) => {
			icrcDefaultTokensStore.reset(data.ledgerCanisterId);

			toastsError({
				msg: { text: get(i18n).init.error.icrc_canisters },
				err
			});
		},
		strategy,
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
	nonNullish(data) && icrcDefaultTokensStore.set({ data, certified });
};

const loadIcrcCustomTokens = async (params: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<IcrcCustomTokenWithoutId[]> => {
	const tokens = await listCustomTokens(params);

	// We filter the custom tokens that are Icrc (the backend "Custom Token" potentially supports other types).
	const icrcTokens = tokens.filter(({ token }) => 'Icrc' in token);

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
}): Promise<IcrcCustomTokenWithoutId[]> => {
	const indexedIcrcCustomTokens = buildIndexedIcrcCustomTokens();

	const requestIcrcCustomTokenMetadata = async (
		token: CustomToken,
		index: number
	): Promise<IcrcCustomTokenWithoutId | undefined> => {
		const {
			enabled,
			version: v,
			token: {
				Icrc: { ledger_id, index_id }
			}
		} = token;

		const indexCanisterId = fromNullable(index_id);

		// Index canister ID currently mandatory in Oisy's frontend
		if (isNullish(indexCanisterId)) {
			return undefined;
		}

		const ledgerCanisterIdText = ledger_id.toText();

		// For performance reasons, if we can build the token metadata using the known custom tokens from the environments, we do so and save a call to the ledger to fetch the metadata.
		const meta = buildIcrcCustomTokenMetadataPseudoResponse({
			icrcCustomTokens: indexedIcrcCustomTokens,
			ledgerCanisterId: ledgerCanisterIdText
		});

		const data: IcrcLoadData = {
			metadata: nonNullish(meta)
				? meta
				: await metadata({ ledgerCanisterId: ledgerCanisterIdText, identity, certified }),
			ledgerCanisterId: ledgerCanisterIdText,
			indexCanisterId: indexCanisterId.toText(),
			position: ICRC_TOKENS.length + 1 + index,
			category: 'custom',
			icrcCustomTokens: indexedIcrcCustomTokens
		};

		const t = mapIcrcToken(data);

		const version = fromNullable(v);

		return isNullish(t)
			? undefined
			: {
					...t,
					enabled,
					...(nonNullish(version) && { version })
				};
	};

	return (await Promise.all(tokens.map(requestIcrcCustomTokenMetadata))).filter(nonNullish);
};

const loadIcrcCustomData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: IcrcCustomTokenWithoutId[];
}) => {
	icrcCustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
