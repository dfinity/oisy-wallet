import type { CustomToken, IcrcToken } from '$declarations/backend/backend.did';
import { ICRC_CK_TOKENS_LEDGER_CANISTER_IDS, ICRC_TOKENS } from '$env/networks/networks.icrc.env';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import { balance, metadata } from '$icp/api/icrc-ledger.api';
import { buildIndexedDip20Tokens } from '$icp/services/dip20-tokens.services';
import { buildIndexedIcpTokens } from '$icp/services/icp-tokens.services';
import { buildIndexedIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcCkToken, IcInterface, IcToken } from '$icp/types/ic-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import {
	buildIcrcCustomTokenMetadataPseudoResponse,
	mapIcrcToken,
	mapTokenOisyName,
	mapTokenOisySymbol,
	type IcrcLoadData
} from '$icp/utils/icrc.utils';
import { TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { exchangeRateERC20ToUsd, exchangeRateICRCToUsd } from '$lib/services/exchange.services';
import { balancesStore } from '$lib/stores/balances.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenCategory } from '$lib/types/token';
import { mapIcErrorMetadata } from '$lib/utils/error.utils';
import { AnonymousIdentity, type Identity } from '@dfinity/agent';
import {
	fromNullable,
	isNullish,
	nonNullish,
	queryAndUpdate,
	type QueryAndUpdateRequestParams,
	type QueryAndUpdateStrategy
} from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadIcrcTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	await Promise.all([loadDefaultIcrcTokens(), loadCustomTokens({ identity, useCache: true })]);
};

const loadDefaultIcrcTokens = async () => {
	await Promise.all(
		ICRC_TOKENS.map(mapTokenOisyName)
			.map(mapTokenOisySymbol)
			.map((token) => loadDefaultIcrc({ data: token }))
	);
};

export const loadCustomTokens = ({
	identity,
	useCache = false,
	onSuccess
}: {
	identity: OptionIdentity;
	useCache?: boolean;
	onSuccess?: () => void;
}): Promise<void> =>
	queryAndUpdate<IcrcCustomToken[]>({
		request: (params) => loadIcrcCustomTokens({ ...params, useCache }),
		onLoad: (params) => loadIcrcCustomData({ ...params, onSuccess }),
		onUpdateError: ({ error: err }) => {
			icrcCustomTokensStore.resetAll();

			trackEvent({
				name: TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR,
				metadata: mapIcErrorMetadata(err)
			});

			toastsError({
				msg: { text: get(i18n).init.error.icrc_canisters },
				err
			});
		},
		identity
	});

const loadDefaultIcrc = ({
	data,
	strategy
}: {
	data: IcInterface;
	strategy?: QueryAndUpdateStrategy;
}): Promise<void> =>
	queryAndUpdate<IcrcLoadData>({
		request: (params) => requestIcrcMetadata({ ...params, ...data, category: 'default' }),
		onLoad: loadIcrcData,
		onUpdateError: ({ error: err }) => {
			icrcDefaultTokensStore.reset(data.ledgerCanisterId);

			trackEvent({
				name: TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR,
				metadata: mapIcErrorMetadata(err)
			});

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

const loadIcrcCustomTokens = async ({
	identity,
	certified,
	useCache = false
}: {
	identity: OptionIdentity;
	certified: boolean;
	useCache?: boolean;
}): Promise<IcrcCustomToken[]> => {
	const tokens = await loadNetworkCustomTokens({
		identity,
		certified,
		filterTokens: ({ token }) => 'Icrc' in token,
		useCache
	});

	return await loadCustomIcrcTokensData({
		tokens,
		identity,
		certified
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
}): Promise<IcrcCustomToken[]> => {
	const indexedIcrcCustomTokens = {
		...buildIndexedIcpTokens(),
		...buildIndexedIcrcCustomTokens(),
		...buildIndexedDip20Tokens()
	};

	// eslint-disable-next-line local-rules/prefer-object-params -- This is a mapping function, so the parameters will be provided not as an object but as separate arguments.
	const requestIcrcCustomTokenMetadata = async (
		custom_token: CustomToken,
		index: number
	): Promise<IcrcCustomToken | undefined> => {
		const { enabled, version: v, token } = custom_token;

		if (!('Icrc' in token)) {
			throw new Error('Token is not Icrc');
		}

		const {
			Icrc: { ledger_id, index_id }
		} = token as { Icrc: IcrcToken };

		const indexCanisterId = fromNullable(index_id);

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
			...(nonNullish(indexCanisterId) && { indexCanisterId: indexCanisterId.toText() }),
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

	const results = await Promise.allSettled(tokens.map(requestIcrcCustomTokenMetadata));

	return results.reduce<IcrcCustomToken[]>((acc, result, index) => {
		if (result.status !== 'fulfilled') {
			// For development purposes, we want to see the error in the console.
			console.error(result.reason);

			const { token } = tokens[index];

			if ('Icrc' in token) {
				const {
					Icrc: { ledger_id }
				} = token;

				icrcCustomTokensStore.reset(ledger_id.toString());
			}

			return acc;
		}

		const { value } = result;

		return [...acc, ...(nonNullish(value) ? [value] : [])];
	}, []);
};

const loadIcrcCustomData = ({
	response: tokens,
	certified,
	onSuccess
}: {
	certified: boolean;
	response: IcrcCustomToken[];
	onSuccess?: () => void;
}) => {
	onSuccess?.();

	icrcCustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};

export const loadDisabledIcrcTokensBalances = ({
	identity,
	disabledIcrcTokens
}: {
	identity: Identity;
	disabledIcrcTokens: IcToken[];
}): Promise<void[]> =>
	Promise.all(
		disabledIcrcTokens.map(async ({ ledgerCanisterId, id }) => {
			const icrcTokenBalance = await balance({
				identity,
				owner: identity.getPrincipal(),
				ledgerCanisterId
			});

			balancesStore.set({
				id,
				data: {
					data: icrcTokenBalance,
					certified: true
				}
			});
		})
	);

export const loadDisabledIcrcTokensExchanges = async ({
	disabledIcrcTokens
}: {
	disabledIcrcTokens: IcToken[];
}): Promise<void> => {
	const [currentErc20Prices, currentIcrcPrices] = await Promise.all([
		exchangeRateERC20ToUsd({
			coingeckoPlatformId: 'ethereum',
			contractAddresses: disabledIcrcTokens.reduce<Erc20ContractAddress[]>((acc, token) => {
				const twinTokenAddress = ((token as Partial<IcCkToken>).twinToken as Erc20Token | undefined)
					?.address;

				return nonNullish(twinTokenAddress)
					? [
							...acc,
							{
								address: twinTokenAddress
							}
						]
					: acc;
			}, [])
		}),
		exchangeRateICRCToUsd(
			disabledIcrcTokens.reduce<LedgerCanisterIdText[]>(
				(acc, { ledgerCanisterId }) =>
					!ICRC_CK_TOKENS_LEDGER_CANISTER_IDS.includes(ledgerCanisterId)
						? [...acc, ledgerCanisterId]
						: acc,
				[]
			)
		)
	]);

	exchangeStore.set([
		...(nonNullish(currentErc20Prices) ? [currentErc20Prices] : []),
		...(nonNullish(currentIcrcPrices) ? [currentIcrcPrices] : [])
	]);
};
