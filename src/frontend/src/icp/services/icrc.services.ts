import type { CustomToken, IcrcToken } from '$declarations/backend/backend.did';
import { ADDITIONAL_ICRC_TOKENS_INDEXED } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { ICRC_CK_TOKENS_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import { ICRC_TOKENS, ICRC_TOKENS_METADATA } from '$env/tokens/tokens-icrc/tokens.icrc.env';
import {
	RETIRED_ICRC_LEDGER_CANISTER_IDS,
	RETIRED_ICRC_TOKENS
} from '$env/tokens/tokens-icrc/tokens.icrc.retired.env';
import { DIP20_BUILTIN_TOKENS_INDEXED } from '$env/tokens/tokens.dip20.env';
import { SUPPORTED_ICP_TOKENS_INDEXED } from '$env/tokens/tokens.icp.env';
import { SNS_BUILTIN_TOKENS_INDEXED } from '$env/tokens/tokens.sns.env';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import {
	balance,
	getMintingAccount,
	icrc1SupportedStandards,
	allowance as icrcAllowance,
	metadata
} from '$icp/api/icrc-ledger.api';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import {
	IcTokenStandards,
	type IcCkToken,
	type IcInterface,
	type IcToken
} from '$icp/types/ic-token';
import type { IcrcCustomToken, IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
import { buildIcrcCustomTokenMetadataPseudoResponse } from '$icp/utils/icrc-metadata.utils';
import {
	mapIcrcToken,
	mapTokenOisyName,
	mapTokenOisySymbol,
	type IcrcLoadData
} from '$icp/utils/icrc.utils';
import { TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR } from '$lib/constants/analytics.constants';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { exchangeRateERC20ToUsd, exchangeRateICRCToUsd } from '$lib/services/exchange.services';
import { balancesStore } from '$lib/stores/balances.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { NullishIdentity } from '$lib/types/identity';
import type { TokenCategory } from '$lib/types/token';
import { mapIcErrorMetadata } from '$lib/utils/error.utils';
import { isTcyclesLedgerCanisterId } from '$lib/utils/exchange.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	fromNullable,
	isNullish,
	nonNullish,
	nowInBigIntNanoSeconds,
	queryAndUpdate,
	type QueryAndUpdateRequestParams
} from '@dfinity/utils';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

export const loadDefaultIcrcTokens = async () => {
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
}: Omit<LoadCustomTokenParams, 'certified'> & {
	onSuccess?: () => void;
}): Promise<void> =>
	queryAndUpdate<IcrcCustomToken[]>({
		request: (params) => loadIcrcCustomTokens({ ...params, useCache }),
		onLoad: (params) => loadIcrcCustomData({ ...params, onSuccess }),
		onUpdateError: onCustomTokensUpdateError,
		identity
	});

const loadDefaultIcrc = ({
	data: { ledgerCanisterId, ...data }
}: {
	data: IcInterface;
}): Promise<void> =>
	queryAndUpdate<IcrcLoadData>({
		request: (params) =>
			requestIcrcMetadata({ ...params, ...data, ledgerCanisterId, category: 'default' }),
		onLoad: loadIcrcData,
		onUpdateError: (params) => onDefaultTokensUpdateError({ ...params, ledgerCanisterId }),
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
	metadata:
		ICRC_TOKENS_METADATA.get(ledgerCanisterId) ??
		(await metadata({ ledgerCanisterId, identity, certified }))
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

// The loading rounds of the saved ICRC tokens, numbered in the order they start, and the last
// certified round that wrote the unavailable tokens.
let customTokensRound = 0;
let unavailableTokensCertifiedRound = 0;

const loadIcrcCustomTokens = async ({
	identity,
	certified,
	tokens,
	useCache = false
}: LoadCustomTokenParams): Promise<IcrcCustomToken[]> => {
	// Taken before the saved tokens are fetched, so the query round of a load always comes first.
	const round = ++customTokensRound;

	const customTokens =
		tokens ??
		(await loadNetworkCustomTokens({
			identity,
			certified,
			useCache
		}));

	return await loadCustomIcrcTokensData({
		tokens: customTokens,
		identity,
		certified,
		round
	});
};

const loadCustomIcrcTokensData = async ({
	tokens,
	certified,
	identity,
	round
}: {
	tokens: CustomToken[];
	certified: boolean;
	identity: NullishIdentity;
	round: number;
}): Promise<IcrcCustomToken[]> => {
	const indexedIcrcCustomTokens = {
		...SUPPORTED_ICP_TOKENS_INDEXED,
		...SNS_BUILTIN_TOKENS_INDEXED,
		...DIP20_BUILTIN_TOKENS_INDEXED,
		...ADDITIONAL_ICRC_TOKENS_INDEXED
	};

	const requestIcrcCustomTokenMetadata = async (
		custom_token: CustomToken
	): Promise<IcrcCustomToken | undefined> => {
		const {
			token,
			enabled,
			version: versionNullable,
			allow_external_content_source: allowExternalContentSourceNullable
		} = custom_token;

		if (!('Icrc' in token)) {
			return;
		}

		const {
			Icrc: { ledger_id, index_id }
		} = token as { Icrc: IcrcToken };

		const indexCanisterId = fromNullable(index_id);

		const ledgerCanisterIdText = ledger_id.toText();

		if (RETIRED_ICRC_LEDGER_CANISTER_IDS.includes(ledgerCanisterIdText)) {
			return;
		}

		// For performance reasons, if we can build the token metadata using the known custom tokens from the environments, we do so and save a call to the ledger to fetch the metadata.
		const meta = buildIcrcCustomTokenMetadataPseudoResponse({
			icrcCustomTokens: indexedIcrcCustomTokens,
			ledgerCanisterId: ledgerCanisterIdText
		});

		const serviceParams = { ledgerCanisterId: ledgerCanisterIdText, identity, certified };

		const data: IcrcLoadData = {
			metadata: nonNullish(meta) ? meta : await metadata(serviceParams),
			mintingAccount: await getMintingAccount(serviceParams),
			ledgerCanisterId: ledgerCanisterIdText,
			...(nonNullish(indexCanisterId) && { indexCanisterId: indexCanisterId.toText() }),
			category: 'custom',
			icrcCustomTokens: indexedIcrcCustomTokens
		};

		const t = mapIcrcToken(data);

		const version = fromNullable(versionNullable);
		const allowExternalContentSource = fromNullable(allowExternalContentSourceNullable);

		return isNullish(t)
			? undefined
			: {
					...t,
					enabled,
					version,
					allowExternalContentSource
				};
	};

	const results = await Promise.allSettled(tokens.map(requestIcrcCustomTokenMetadata));

	// A saved token that is skipped or fails to load never reaches the token list, so it is kept here for the user to delete.
	const unavailableTokens = tokens.reduce<IcrcUnavailableCustomToken[]>(
		(acc, customToken, index) => {
			const { token } = customToken;

			if (!('Icrc' in token)) {
				return acc;
			}

			const ledgerCanisterId = token.Icrc.ledger_id.toText();

			const result = results[index];

			if (
				!RETIRED_ICRC_LEDGER_CANISTER_IDS.includes(ledgerCanisterId) &&
				result.status === 'fulfilled' &&
				nonNullish(result.value)
			) {
				return acc;
			}

			const knownToken =
				indexedIcrcCustomTokens[ledgerCanisterId] ??
				RETIRED_ICRC_TOKENS.find(({ ledgerCanisterId: id }) => id === ledgerCanisterId);

			return [
				...acc,
				{
					ledgerCanisterId,
					...(nonNullish(knownToken) && { symbol: knownToken.symbol, name: knownToken.name }),
					customToken
				}
			];
		},
		[]
	);

	// A query round can finish after the certified round of its load, and a round of an older load
	// after a newer one: neither may replace what a certified round that started later has written.
	if (round > unavailableTokensCertifiedRound) {
		if (certified) {
			unavailableTokensCertifiedRound = round;
		}

		icrcUnavailableCustomTokensStore.set(unavailableTokens);
	}

	return results.reduce<IcrcCustomToken[]>((acc, result, index) => {
		if (result.status !== 'fulfilled') {
			trackEvent({
				name: PLAUSIBLE_EVENTS.LOAD_CUSTOM_TOKENS,
				metadata: {
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
					event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS.ICRC,
					...(mapIcErrorMetadata(result.reason) ?? {})
				}
			});

			const { enabled, token } = tokens[index];

			if ('Icrc' in token) {
				const {
					Icrc: { ledger_id }
				} = token;

				const ledgerCanisterId = ledger_id.toText();

				icrcCustomTokensStore.resetByIdentifier(ledgerCanisterId);

				// To avoid polluting the screen, we show the toast error only after the update call.
				if (enabled && certified) {
					const curatedToken = indexedIcrcCustomTokens[ledgerCanisterId];

					toastsShow({
						text: nonNullish(curatedToken)
							? replacePlaceholders(get(i18n).init.error.icrc_canister_loading_curated, {
									$tokenSymbol: curatedToken.symbol
								})
							: replacePlaceholders(get(i18n).init.error.icrc_canister_loading_custom, {
									$ledgerCanisterId: ledgerCanisterId
								}),
						level: 'warn'
					});
				}
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

	// A round that read the saved tokens before a delete would otherwise put the deleted token back.
	icrcCustomTokensStore.setAll(
		tokens
			.filter(
				({ ledgerCanisterId }) => !icrcUnavailableCustomTokensStore.isDeleted(ledgerCanisterId)
			)
			.map((token) => ({ data: token, certified }))
	);
};

const onCustomTokensUpdateError = ({ error: err }: { error: unknown }) => {
	icrcCustomTokensStore.resetAll();

	trackEvent({
		name: TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR,
		metadata: mapIcErrorMetadata(err)
	});

	toastsError({
		msg: { text: get(i18n).init.error.load_token_list }
	});
};

export const processCustomTokens = async (params: LoadCustomTokenParams): Promise<void> => {
	try {
		const response = await loadIcrcCustomTokens(params);

		loadIcrcCustomData({ response, certified: params.certified });
	} catch (err) {
		if (params.certified) {
			onCustomTokensUpdateError({ error: err });
		}
	}
};

const onDefaultTokensUpdateError = ({
	error: err,
	ledgerCanisterId
}: {
	error: unknown;
	ledgerCanisterId: LedgerCanisterIdText;
}) => {
	icrcDefaultTokensStore.reset(ledgerCanisterId);

	trackEvent({
		name: TRACK_COUNT_IC_LOADING_ICRC_CANISTER_ERROR,
		metadata: { ...mapIcErrorMetadata(err), ledgerCanisterId }
	});
};

// TODO: Refactor to use queryAndUpdate
export const loadDisabledIcrcTokensBalances = async ({
	identity,
	disabledIcrcTokens
}: {
	identity: Identity;
	disabledIcrcTokens: IcToken[];
}): Promise<void> => {
	const certified = true;

	const results = await Promise.allSettled(
		disabledIcrcTokens.map(async ({ ledgerCanisterId, id }) => {
			const icrcTokenBalance = await balance({
				identity,
				owner: identity.getPrincipal(),
				ledgerCanisterId,
				certified
			});

			return { id, icrcTokenBalance };
		})
	);

	// TODO: Reduce the number of loops
	results.forEach((result) => {
		if (result.status === 'fulfilled') {
			const { id, icrcTokenBalance } = result.value;
			balancesStore.batchSet({
				id,
				data: {
					data: icrcTokenBalance,
					certified
				}
			});
		}
	});
};

export const loadDisabledIcrcTokensExchanges = async ({
	disabledIcrcTokens
}: {
	disabledIcrcTokens: IcToken[];
}): Promise<void> => {
	const results = await Promise.allSettled([
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
					// TCYCLES gets its XDR price from the exchange worker, never a market price.
					!ICRC_CK_TOKENS_LEDGER_CANISTER_IDS.includes(ledgerCanisterId) &&
					!isTcyclesLedgerCanisterId(ledgerCanisterId)
						? [...acc, ledgerCanisterId]
						: acc,
				[]
			)
		)
	]);

	const [erc20Result, icrcResult] = results;

	exchangeStore.set([
		...(erc20Result.status === 'fulfilled' && nonNullish(erc20Result.value)
			? [erc20Result.value]
			: []),
		...(icrcResult.status === 'fulfilled' && nonNullish(icrcResult.value) ? [icrcResult.value] : [])
	]);
};

/**
 * Checks if the owner has sufficient allowance for the spender to execute a transaction.
 *
 * The allowanceBuffer ensures the allowance won't expire while the transaction is being processed.
 * For example, if the allowance expires in 10 seconds but the swap takes 20 seconds to complete,
 * we should request a new approval instead of starting a transaction that will fail.
 *
 * @returns `true` if allowance is sufficient and won't expire within the buffer period, `false` otherwise
 *
 */
export const hasSufficientIcrcAllowance = async ({
	identity,
	ledgerCanisterId,
	owner,
	spender,
	amount,
	allowanceBuffer
}: {
	identity: Identity;
	ledgerCanisterId: CanisterIdText;
	owner: Principal;
	spender: Principal;
	amount: bigint;
	allowanceBuffer?: bigint;
}): Promise<boolean> => {
	const { allowance, expires_at } = await icrcAllowance({
		identity,
		ledgerCanisterId,
		owner: { owner },
		spender: { owner: spender },
		certified: false
	});

	const hasSufficientAllowance = allowance >= amount;

	if (isNullish(allowanceBuffer)) {
		return hasSufficientAllowance;
	}

	const expiredBuffer = nowInBigIntNanoSeconds() + allowanceBuffer;
	const expiredAt = fromNullable(expires_at);
	const isNotExpired = nonNullish(expiredAt) && expiredAt > expiredBuffer;

	return hasSufficientAllowance && isNotExpired;
};

export const isIcrcTokenSupportIcrc2 = async ({
	identity,
	ledgerCanisterId
}: {
	identity: NullishIdentity;
	ledgerCanisterId: CanisterIdText;
}) => {
	const supportedStandards = await icrc1SupportedStandards({
		identity,
		ledgerCanisterId
	});

	return supportedStandards.some(({ name }) => name === IcTokenStandards.icrc2);
};

// A ledger's standards do not change while the app runs, so each ledger is asked once per session.
const icrc3SupportByLedger = new Map<CanisterIdText, Promise<boolean>>();

export const isIcrcTokenSupportIcrc3 = ({
	identity,
	ledgerCanisterId
}: {
	identity: NullishIdentity;
	ledgerCanisterId: CanisterIdText;
}): Promise<boolean> => {
	const cached = icrc3SupportByLedger.get(ledgerCanisterId);

	if (nonNullish(cached)) {
		return cached;
	}

	const supported = icrc1SupportedStandards({ identity, ledgerCanisterId, certified: false })
		.then((standards) => standards.some(({ name }) => name === IcTokenStandards.icrc3))
		.catch((err: unknown) => {
			// A failed call is not an answer: the next caller asks the ledger again.
			icrc3SupportByLedger.delete(ledgerCanisterId);
			throw err;
		});

	icrc3SupportByLedger.set(ledgerCanisterId, supported);

	return supported;
};
