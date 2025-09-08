import {
	saveErc1155CustomTokens,
	saveErc20CustomTokens,
	saveErc20UserTokens,
	saveErc721CustomTokens
} from '$eth/services/manage-tokens.services';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Erc20CustomToken, SaveErc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { isTokenErc1155CustomToken } from '$eth/utils/erc1155.utils';
import { isTokenErc20UserToken } from '$eth/utils/erc20.utils';
import { isTokenErc721CustomToken } from '$eth/utils/erc721.utils';
import { saveIcrcCustomTokens } from '$icp/services/manage-tokens.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { icTokenIcrcCustomToken, isTokenDip20, isTokenIcrc } from '$icp/utils/icrc.utils';
import { isIcCkToken, isIcToken } from '$icp/validation/ic-token.validation';
import { LOCAL, ZERO } from '$lib/constants/app.constants';
import type { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { ManageTokensSaveParams } from '$lib/services/manage-tokens.services';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { toastsShow } from '$lib/stores/toasts.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import type { TokensTotalUsdBalancePerNetwork } from '$lib/types/token-balance';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { UserNetworks } from '$lib/types/user-networks';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { calculateTokenUsdBalance, mapTokenUi } from '$lib/utils/token.utils';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
import { saveSplCustomTokens } from '$sol/services/manage-tokens.services';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import { isTokenSplToggleable } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Sorts tokens by market cap, name and network name, pinning the specified ones at the top of the list in the order they are provided.
 *
 * @param $tokens - The list of tokens to sort.
 * @param $tokensToPin - The list of tokens to pin at the top of the list.
 * @param $exchanges - The exchange rates for the tokens.
 */
export const sortTokens = <T extends Token>({
	$tokens,
	$exchanges,
	$tokensToPin
}: {
	$tokens: T[];
	$exchanges: ExchangesData;
	$tokensToPin: TokenToPin[];
}): T[] => {
	const pinnedTokens = $tokensToPin
		.map(({ id: pinnedId, network: { id: pinnedNetworkId } }) =>
			$tokens.find(
				({ id, network: { id: networkId } }) => id === pinnedId && networkId === pinnedNetworkId
			)
		)
		.filter(nonNullish);

	const otherTokens = $tokens.filter(
		(token) =>
			!pinnedTokens.some(
				({ id, network: { id: networkId } }) => id === token.id && networkId === token.network.id
			)
	);

	return [
		...pinnedTokens,
		...otherTokens.sort((a, b) => {
			// Deprecated SNSes such as CTS
			if (isIcToken(a) && (a.deprecated ?? false)) {
				return 1;
			}

			if (isIcToken(b) && (b.deprecated ?? false)) {
				return -1;
			}

			return (
				($exchanges[b.id]?.usd_market_cap ?? 0) - ($exchanges[a.id]?.usd_market_cap ?? 0) ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
			);
		})
	];
};

/**
 * Pins tokens by USD value, balance and name.
 *
 * The function pins on top of the list the tokens that have a balance and/or an exchange rate.
 * It sorts first the ones that have an exchange rate and balance non-zero, according to their usd value (descending).
 * Then, it sorts the ones that have only a balance non-zero and no exchange rate, according to their balance (descending).
 * Finally, it leaves the rest of the tokens untouched.
 * In case of a tie, it sorts by token name and network name.
 *
 * @param $tokens - The list of tokens to sort.
 * @param $balancesStore - The balances data for the tokens.
 * @param $exchanges - The exchange rates data for the tokens.
 * @returns The sorted list of tokens.
 *
 */
export const pinTokensWithBalanceAtTop = <T extends Token>({
	$tokens,
	$balances,
	$exchanges
}: {
	$tokens: T[];
	$balances: CertifiedStoreData<BalancesData>;
	$exchanges: ExchangesData;
}): TokenUi<T>[] => {
	// If balances data are nullish, there is no need to sort.
	if (isNullish($balances)) {
		return $tokens.map((token) => mapTokenUi({ token, $balances, $exchanges }));
	}

	const [positiveBalances, nonPositiveBalances] = $tokens.reduce<[TokenUi<T>[], TokenUi<T>[]]>(
		(acc, token) => {
			const tokenUI: TokenUi<T> = mapTokenUi<T>({
				token,
				$balances,
				$exchanges
			});

			return (tokenUI.usdBalance ?? 0) > 0 || (tokenUI.balance ?? ZERO) > 0
				? [[...acc[0], tokenUI], acc[1]]
				: [acc[0], [...acc[1], tokenUI]];
		},
		[[], []]
	);

	return [
		...positiveBalances.sort(
			(a, b) =>
				(b.usdBalance ?? 0) - (a.usdBalance ?? 0) ||
				+((b.balance ?? ZERO) > (a.balance ?? ZERO)) -
					+((b.balance ?? ZERO) < (a.balance ?? ZERO)) ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
		),
		...nonPositiveBalances
	];
};

/**
 * Calculates total USD balance of the provided UI tokens list.
 *
 * @param tokens - The list of UI tokens for total USD balance calculation.
 * @returns The sum of UI tokens USD balance.
 */
export const sumTokensUiUsdBalance = (tokens: TokenUi[]): number =>
	tokens.reduce((acc, token) => acc + (token.usdBalance ?? 0), 0);

/**
 * Calculates total USD balance of mainnet tokens per network from the provided tokens list.
 *
 * @param $tokens - The list of tokens for filtering by network env and total USD balance calculation.
 * @param $balancesStore - The balances data for the tokens.
 * @param $exchanges - The exchange rates data for the tokens.
 * @returns A NetworkId-number dictionary with total USD balance of mainnet tokens per network.
 *
 */
export const sumMainnetTokensUsdBalancesPerNetwork = ({
	$tokens,
	$balances,
	$exchanges
}: {
	$tokens: Token[];
	$balances: CertifiedStoreData<BalancesData>;
	$exchanges: ExchangesData;
}): TokensTotalUsdBalancePerNetwork =>
	nonNullish($exchanges) && nonNullish($balances)
		? $tokens.reduce<TokensTotalUsdBalancePerNetwork>(
				(acc, token) =>
					token.network.env === 'mainnet'
						? {
								...acc,
								[token.network.id]:
									(acc[token.network.id] ?? 0) +
									(calculateTokenUsdBalance({ token, $balances, $exchanges }) ?? 0)
							}
						: acc,
				{}
			)
		: {};

/**
 * Filters and returns a list of "enabled" by user tokens
 *
 * @param $tokens - The list of tokens.
 * @returns The list of "enabled" tokens.
 */
export const filterEnabledTokens = <T extends Token>([$tokens]: [$tokens: T[]]): T[] =>
	$tokens.filter((token) => ('enabled' in token ? token.enabled : true));

/** Pins enabled tokens at the top of the list, preserving the order of the parts.
 *
 * @param $tokens - The list of tokens.
 * @returns The list of tokens with enabled tokens at the top.
 * */
export const pinEnabledTokensAtTop = <T extends Token>(
	$tokens: TokenToggleable<T>[]
): TokenToggleable<T>[] => $tokens.sort(({ enabled: a }, { enabled: b }) => Number(b) - Number(a));

/** Filters provided tokens list according to a filter keyword
 *
 * @param tokens - The list of tokens.
 * @param filter - filter keyword.
 * @returns Filtered list of tokens.
 * */
export const filterTokens = <T extends Token>({
	tokens,
	filter
}: {
	tokens: T[];
	filter: string;
}): T[] => {
	const matchingToken = (token: Token) =>
		token.name.toLowerCase().includes(filter.toLowerCase()) ||
		token.symbol.toLowerCase().includes(filter.toLowerCase()) ||
		(icTokenIcrcCustomToken(token) &&
			(token.alternativeName ?? '').toLowerCase().includes(filter.toLowerCase()));

	return isNullishOrEmpty(filter)
		? tokens
		: tokens.filter((token) => {
				const twinToken = isIcCkToken(token) ? token.twinToken : undefined;
				return matchingToken(token) || (nonNullish(twinToken) && matchingToken(twinToken));
			});
};

/** Finds the token with the given symbol
 *
 * @param tokens - The list of tokens.
 * @param symbol - symbol of the token to find.
 * @returns Token with the given symbol or undefined.
 */
export const findToken = ({
	tokens,
	symbol
}: {
	tokens: Token[];
	symbol: string;
}): Token | undefined => tokens.find((token) => token.symbol === symbol);

export const defineEnabledTokens = <T extends Token>({
	$testnetsEnabled,
	$userNetworks,
	mainnetFlag,
	mainnetTokens,
	testnetTokens = [],
	localTokens = []
}: {
	$testnetsEnabled: boolean;
	$userNetworks: UserNetworks;
	mainnetFlag: boolean;
	mainnetTokens: T[];
	testnetTokens?: T[];
	localTokens?: T[];
}): T[] =>
	[
		...(mainnetFlag ? mainnetTokens : []),
		...($testnetsEnabled ? [...testnetTokens, ...(LOCAL ? localTokens : [])] : [])
	].filter(({ network: { id: networkId } }) =>
		isUserNetworkEnabled({ userNetworks: $userNetworks, networkId })
	);

export const groupTogglableTokens = (
	tokens: Record<string, Token>
): {
	icrc: IcrcCustomToken[];
	erc20: (Erc20UserToken | Erc20CustomToken)[];
	erc721: Erc721CustomToken[];
	erc1155: Erc1155CustomToken[];
	spl: SplTokenToggleable[];
} =>
	Object.values(tokens ?? {}).reduce<{
		icrc: IcrcCustomToken[];
		erc20: Erc20UserToken[];
		erc721: Erc721CustomToken[];
		erc1155: Erc1155CustomToken[];
		spl: SplTokenToggleable[];
	}>(
		({ icrc, erc20, erc721, erc1155, spl }, token) => ({
			icrc: [
				...icrc,
				...(isTokenIcrc(token) || isTokenDip20(token) ? [token as IcrcCustomToken] : [])
			],
			erc20: [...erc20, ...(isTokenErc20UserToken(token) ? [token] : [])],
			erc721: [...erc721, ...(isTokenErc721CustomToken(token) ? [token] : [])],
			erc1155: [...erc1155, ...(isTokenErc1155CustomToken(token) ? [token] : [])],
			spl: [...spl, ...(isTokenSplToggleable(token) ? [token] : [])]
		}),
		{ icrc: [], erc20: [], erc721: [], erc1155: [], spl: [] }
	);

export const saveAllCustomTokens = async ({
	tokens,
	progress,
	modalNext,
	onSuccess,
	onError,
	$authIdentity,
	$i18n
}: {
	tokens: Record<string, Token>;
	progress?: (step: ProgressStepsAddToken) => ProgressStepsAddToken;
	modalNext?: () => void;
	onSuccess?: () => void;
	onError?: () => void;
	$authIdentity: OptionIdentity;
	$i18n: I18n;
}): Promise<void> => {
	const { icrc, erc20, erc721, erc1155, spl } = groupTogglableTokens(tokens);

	if (
		icrc.length === 0 &&
		erc20.length === 0 &&
		erc721.length === 0 &&
		erc1155.length === 0 &&
		spl.length === 0
	) {
		toastsShow({
			text: $i18n.tokens.manage.info.no_changes,
			level: 'info',
			duration: 5000
		});

		return;
	}

	const commonParams: ManageTokensSaveParams = {
		progress,
		modalNext,
		onSuccess,
		onError,
		identity: $authIdentity
	};

	// TODO: UserToken is deprecated - remove this when the migration to CustomToken is complete
	const customTokens = get(erc20CustomTokensStore) ?? [];
	const currentUserTokens = (get(erc20UserTokensStore) ?? []).map(({ data: token }) => token);
	const erc20UserTokens = [...erc20, ...currentUserTokens].filter(
		(token, index, self) =>
			index ===
			self.findIndex(
				(t) => t.address === token.address && t.network.chainId === token.network.chainId
			)
	);
	const erc20CustomTokens = erc20UserTokens.reduce<SaveErc20CustomToken[]>((acc, token) => {
		const customToken = customTokens.find(
			({
				data: {
					address,
					network: { chainId }
				}
			}) => address === token.address && chainId === token.network.chainId
		);

		return [
			...acc,
			{
				...token,
				...(nonNullish(customToken) ? { version: customToken.data.version } : {})
			}
		];
	}, []);

	await Promise.allSettled([
		...(icrc.length > 0
			? [
					saveIcrcCustomTokens({
						...commonParams,
						tokens: icrc.map((t) => ({ ...t, networkKey: 'Icrc' }))
					})
				]
			: []),
		...(erc20.length > 0
			? [
					// TODO: UserToken is deprecated - remove this when the migration to CustomToken is complete
					saveErc20UserTokens({
						...commonParams,
						tokens: erc20
					}),
					saveErc20CustomTokens({
						...commonParams,
						tokens: erc20CustomTokens
					})
				]
			: []),
		...(erc721.length > 0
			? [
					saveErc721CustomTokens({
						...commonParams,
						tokens: erc721
					})
				]
			: []),
		...(erc1155.length > 0
			? [
					saveErc1155CustomTokens({
						...commonParams,
						tokens: erc1155
					})
				]
			: []),
		...(spl.length > 0
			? [
					saveSplCustomTokens({
						...commonParams,
						tokens: spl
					})
				]
			: [])
	]);
};
