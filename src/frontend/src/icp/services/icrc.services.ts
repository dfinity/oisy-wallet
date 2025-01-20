import type { CustomToken } from '$declarations/backend/backend.did';
import { ICRC_CK_TOKENS_LEDGER_CANISTER_IDS, ICRC_TOKENS } from '$env/networks/networks.icrc.env';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import { balance, metadata } from '$icp/api/icrc-ledger.api';
import { buildIndexedIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcCkToken, IcInterface, IcToken } from '$icp/types/ic-token';
import type { IcrcCustomTokenWithoutId } from '$icp/types/icrc-custom-token';
import {
	buildIcrcCustomTokenMetadataPseudoResponse,
	mapIcrcToken,
	mapTokenOisyName,
	type IcrcLoadData
} from '$icp/utils/icrc.utils';
import {
	queryAndUpdate,
	type QueryAndUpdateRequestParams,
	type QueryAndUpdateStrategy
} from '$lib/actors/query.ic';
import { listCustomTokens } from '$lib/api/backend.api';
import { exchangeRateERC20ToUsd, exchangeRateICRCToUsd } from '$lib/services/exchange.services';
import { balancesStore } from '$lib/stores/balances.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenCategory } from '$lib/types/token';
import { AnonymousIdentity, type Identity } from '@dfinity/agent';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

export const loadIcrcTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	await Promise.all([loadDefaultIcrcTokens(), loadCustomTokens({ identity })]);
};

const loadDefaultIcrcTokens = async () => {
	await Promise.all(
		ICRC_TOKENS.map(mapTokenOisyName).map((token) => loadDefaultIcrc({ data: token }))
	);
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

/**
 * @todo Add missing document and test for this function.
 */
const loadIcrcCustomTokens = async (params: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<IcrcCustomTokenWithoutId[]> => {
	const tokens = await listCustomTokens({
		...params,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

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

	// eslint-disable-next-line local-rules/prefer-object-params -- This is a mapping function, so the parameters will be provided not as an object but as separate arguments.
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
				tokenId: id,
				data: {
					data: BigNumber.from(icrcTokenBalance),
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
		exchangeRateERC20ToUsd(
			disabledIcrcTokens.reduce<Erc20ContractAddress[]>((acc, token) => {
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
		),
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
