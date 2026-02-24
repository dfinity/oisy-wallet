import { isTokenErc1155, isTokenErc1155CustomToken } from '$eth/utils/erc1155.utils';
import { isTokenErc20, isTokenErc20CustomToken } from '$eth/utils/erc20.utils';
import { isTokenErc4626CustomToken } from '$eth/utils/erc4626.utils';
import { isTokenErc721, isTokenErc721CustomToken } from '$eth/utils/erc721.utils';
import { isTokenDip721CustomToken } from '$icp/utils/dip721.utils';
import { isTokenExtCustomToken } from '$icp/utils/ext.utils';
import { isTokenIcNft } from '$icp/utils/ic-nft.utils';
import { isTokenIcPunksCustomToken } from '$icp/utils/icpunks.utils';
import {
	isTokenDip20,
	isTokenIc,
	isTokenIcrc,
	isTokenIcrcCustomToken
} from '$icp/utils/icrc.utils';
import { isIcCkToken } from '$icp/validation/ic-token.validation';
import { LOCAL, ZERO } from '$lib/constants/app.constants';
import type { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { saveCustomTokensWithKey } from '$lib/services/manage-tokens.services';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token, TokenId } from '$lib/types/token';
import type { TokensTotalUsdBalancePerNetwork } from '$lib/types/token-balance';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import type { TokensSortType } from '$lib/types/tokens-sort';
import type { UserNetworks } from '$lib/types/user-networks';
import { areAddressesPartiallyEqual, getCaseSensitiveness } from '$lib/utils/address.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdSOLDevnet } from '$lib/utils/network.utils';
import { isTokenNonFungible } from '$lib/utils/nft.utils';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { filterEnabledToken } from '$lib/utils/token.utils';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
import { isTokenSpl, isTokenSplCustomToken } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

const unwrapTokenSortFields = <T extends Token>(tokenOrGroup: TokenUi<T> | TokenUiOrGroupUi) => {
	const t =
		'group' in tokenOrGroup || 'token' in tokenOrGroup ? tokenOrGroup : { token: tokenOrGroup };

	const isGroup = isTokenUiGroup(t);

	const item = isGroup ? t.group : t.token;

	return {
		deprecated: isGroup ? false : (t.token.deprecated ?? false),
		id: isGroup ? t.group.groupData.id : t.token.id,
		symbol: isGroup ? t.group.groupData.symbol : t.token.symbol,
		name: isGroup ? t.group.groupData.name : t.token.name,
		networkName: isGroup ? '' : t.token.network.name,
		usdBalance: item.usdBalance,
		usdPriceChangePercentage24h: item.usdPriceChangePercentage24h,
		usdMarketCap: item.usdMarketCap,
		balance: item.balance
	};
};

// Overload 1: TokenUi<T>[]
export function sortTokens<T extends Token>(params: {
	$tokens: TokenUi<T>[];
	$tokensToPin: TokenToPin[];
	primarySortStrategy?: TokensSortType;
}): TokenUi<T>[];
// Overload 2: TokenUiOrGroupUi[]
export function sortTokens(params: {
	$tokens: TokenUiOrGroupUi[];
	$tokensToPin: TokenToPin[];
	primarySortStrategy?: TokensSortType;
}): TokenUiOrGroupUi[];
/**
 * Creates a comparator function for sorting tokens based on multiple criteria:
 *
 * 1. Deprecation status (non-deprecated tokens first).
 * 2. Primary sorting strategy (either performance or symbol, or value by default, based on the provided parameter).
 * 3. USD balance (descending).
 * 4. Explicitly pinned tokens (pinned first, preserving the order provided by `pinIndexById`).
 * 5. Token symbol (ascending, locale-aware).
 * 6. Token name (ascending, locale-aware).
 * 7. Network name (ascending, locale-aware).
 * 8. Token balance (descending).
 * 9. USD market cap (descending).
 *
 * The `primarySortStrategy` parameter allows overriding the default sorting by value with either performance or symbol prioritisation.
 *
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function sortTokens<T extends Token>({
	$tokens,
	$tokensToPin,
	primarySortStrategy = 'value'
}: {
	$tokens: TokenUi<T>[] | TokenUiOrGroupUi[];
	$tokensToPin: TokenToPin[];
	primarySortStrategy?: TokensSortType;
}): TokenUi<T>[] | TokenUiOrGroupUi[] {
	const pinIndexById = new Map<TokenId, number>($tokensToPin.map(({ id }, index) => [id, index]));

	const getPinIndex = (tokenOrGroup: TokenUi<T> | TokenUiOrGroupUi) => {
		const t =
			'group' in tokenOrGroup || 'token' in tokenOrGroup ? tokenOrGroup : { token: tokenOrGroup };

		const isGroup = isTokenUiGroup(t);

		if (!isGroup) {
			return pinIndexById.get(t.token.id);
		}

		// If a group contains pinned tokens, treat the group as pinned.
		// Pick the earliest pin index (so group pin order matches $tokensToPin order).
		const indices: number[] = [];

		// Adjust this to whatever your group's token collection actually is.
		// Common possibilities: t.group.tokens, t.group.items, t.group.groupData.tokens, etc.
		for (const tok of t.group.tokens) {
			const idx = pinIndexById.get(tok.id);
			if (idx !== undefined) {
				indices.push(idx);
			}
		}

		return indices.length ? Math.min(...indices) : undefined;
	};

	const tokens = $tokens.map((token) => ({
		token,
		unwrapped: unwrapTokenSortFields(token)
	}));

	return tokens
		.sort((a, b) => {
			const {
				unwrapped: {
					deprecated: aDeprecated,
					usdPriceChangePercentage24h: aUsdPriceChangePercentage24h,
					symbol: aSymbol,
					usdBalance: aUsdBalance,
					name: aName,
					networkName: aNetworkName,
					balance: aBalance,
					usdMarketCap: aUsdMarketCap
				}
			} = a;
			const {
				unwrapped: {
					deprecated: bDeprecated,
					usdPriceChangePercentage24h: bUsdPriceChangePercentage24h,
					symbol: bSymbol,
					usdBalance: bUsdBalance,
					name: bName,
					networkName: bNetworkName,
					balance: bBalance,
					usdMarketCap: bUsdMarketCap
				}
			} = b;

			// Deprecated last
			if ((aDeprecated ?? false) !== (bDeprecated ?? false)) {
				return aDeprecated ? 1 : -1;
			}

			// If the choice is to prioritise performance sorting
			if (primarySortStrategy === 'performance') {
				const performanceDiff =
					(bUsdPriceChangePercentage24h ?? 0) - (aUsdPriceChangePercentage24h ?? 0);
				if (performanceDiff !== 0) {
					return performanceDiff;
				}
			}

			// If the choice is to prioritise symbol sorting
			if (primarySortStrategy === 'symbol') {
				const symbolDiff = aSymbol.localeCompare(bSymbol);
				if (symbolDiff !== 0) {
					return symbolDiff;
				}
			}

			// Tie-breaker after primary strategy
			// USD Balance descending
			const usdBalanceDiff = (bUsdBalance ?? 0) - (aUsdBalance ?? 0);
			if (usdBalanceDiff !== 0) {
				return usdBalanceDiff;
			}

			// Pinned tokens (pinned first; pinned order = order provided)
			const aPin = getPinIndex(a.token);
			const bPin = getPinIndex(b.token);
			const aPinned = aPin !== undefined;
			const bPinned = bPin !== undefined;
			if (aPinned !== bPinned) {
				return aPinned ? -1 : 1;
			}
			if (aPinned && bPinned) {
				return aPin - bPin;
			}

			return (
				aSymbol.localeCompare(bSymbol) ||
				aName.localeCompare(bName) ||
				aNetworkName.localeCompare(bNetworkName) ||
				+((bBalance ?? ZERO) > (aBalance ?? ZERO)) - +((bBalance ?? ZERO) < (aBalance ?? ZERO)) ||
				(bUsdMarketCap ?? 0) - (aUsdMarketCap ?? 0)
			);
		})
		.map(({ token }) => token) as TokenUi<T>[] | TokenUiOrGroupUi[];
}

/**
 * Calculates total USD balance of the provided UI tokens list.
 *
 * @param tokens - The list of UI tokens for total USD balance calculation.
 * @returns The sum of UI tokens USD balance.
 */
export const sumTokensUiUsdBalance = (tokens: TokenUi[]): number =>
	tokens.reduce((acc, token) => acc + (token.usdBalance ?? 0), 0);

/**
 * Calculates total USD stake balance of the provided UI tokens list, including claimable rewards.
 *
 * @param tokens - The list of UI tokens for total USD stake balance calculation.
 * @returns The sum of UI tokens USD stake balance.
 */
export const sumTokensUiUsdStakeBalance = (tokens: TokenUi[]): number =>
	tokens.reduce(
		(acc, token) => acc + ((token.stakeUsdBalance ?? 0) + (token.claimableStakeBalanceUsd ?? 0)),
		0
	);

/**
 * Calculates total USD balance of mainnet tokens per network from the provided tokens list.
 *
 * @param tokens - The list of UI tokens for filtering by network env and total USD balance calculation.
 * @returns A NetworkId-number dictionary with total USD balance of mainnet tokens per network.
 *
 */
export const sumMainnetTokensUsdBalancesPerNetwork = ({
	tokens
}: {
	tokens: TokenUi[];
}): TokensTotalUsdBalancePerNetwork =>
	tokens.reduce<TokensTotalUsdBalancePerNetwork>(
		(acc, { network: { id, env }, usdBalance }) =>
			env === 'mainnet'
				? {
						...acc,
						[id]: (acc[id] ?? 0) + (usdBalance ?? 0)
					}
				: acc,
		{}
	);

/**
 * Calculates total USD stake balance (including claimable rewards) of mainnet tokens per network from the provided tokens list.
 *
 * @param tokens - The list of UI tokens for filtering by network env and total USD stake balance calculation.
 * @returns A NetworkId-number dictionary with total USD stake balance of mainnet tokens per network.
 *
 */
export const sumMainnetTokensUsdStakeBalancesPerNetwork = ({
	tokens
}: {
	tokens: TokenUi[];
}): TokensTotalUsdBalancePerNetwork =>
	tokens.reduce<TokensTotalUsdBalancePerNetwork>(
		(acc, { network: { id, env }, stakeUsdBalance, claimableStakeBalanceUsd }) =>
			env === 'mainnet'
				? {
						...acc,
						[id]: (acc[id] ?? 0) + (stakeUsdBalance ?? 0) + (claimableStakeBalanceUsd ?? 0)
					}
				: acc,
		{}
	);

/**
 * Filters and returns a list of "enabled" by user tokens
 *
 * @param $tokens - The list of tokens.
 * @returns The list of "enabled" tokens.
 */
export const filterEnabledTokens = <T extends Token>([$tokens]: [$tokens: T[]]): T[] =>
	$tokens.filter(filterEnabledToken);

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
	const matchingToken = (token: Token): boolean => {
		const { name, symbol } = token;

		if (
			name.toLowerCase().includes(filter.toLowerCase()) ||
			symbol.toLowerCase().includes(filter.toLowerCase())
		) {
			return true;
		}

		if (
			isTokenIcrcCustomToken(token) &&
			nonNullish(token.alternativeName) &&
			token.alternativeName.toLowerCase().includes(filter.toLowerCase())
		) {
			return true;
		}

		if (isTokenErc20(token) || isTokenErc721(token) || isTokenErc1155(token) || isTokenSpl(token)) {
			return areAddressesPartiallyEqual({
				address1: token.address,
				address2: filter,
				networkId: token.network.id
			});
		}

		if (isTokenIc(token)) {
			const { ledgerCanisterId, indexCanisterId } = token;

			return (
				ledgerCanisterId.toLowerCase().includes(filter.toLowerCase()) ||
				(nonNullish(indexCanisterId) &&
					indexCanisterId.toLowerCase().includes(filter.toLowerCase()))
			);
		}

		if (isTokenIcNft(token)) {
			const { canisterId } = token;

			return canisterId.toLowerCase().includes(filter.toLowerCase());
		}

		return false;
	};

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

const normaliseTokenForSave = (token: Token): SaveCustomTokenWithKey | undefined => {
	if ((isTokenIcrc(token) || isTokenDip20(token)) && isTokenToggleable(token)) {
		return { ...token, networkKey: 'Icrc' };
	}

	if (isTokenExtCustomToken(token)) {
		return { ...token, networkKey: 'ExtV2' };
	}

	if (isTokenDip721CustomToken(token)) {
		return { ...token, networkKey: 'Dip721' };
	}

	if (isTokenIcPunksCustomToken(token)) {
		return { ...token, networkKey: 'IcPunks' };
	}

	if (isTokenErc20CustomToken(token)) {
		return { ...token, chainId: token.network.chainId, networkKey: 'Erc20' };
	}

	if (isTokenErc721CustomToken(token)) {
		return { ...token, chainId: token.network.chainId, networkKey: 'Erc721' };
	}

	if (isTokenErc4626CustomToken(token)) {
		return { ...token, chainId: token.network.chainId, networkKey: 'Erc4626' };
	}

	if (isTokenErc1155CustomToken(token)) {
		return { ...token, chainId: token.network.chainId, networkKey: 'Erc1155' };
	}

	if (isTokenSplCustomToken(token)) {
		return {
			...token,
			networkKey: isNetworkIdSOLDevnet(token.network.id) ? 'SplDevnet' : 'SplMainnet'
		};
	}
};

const normalizeTokensForSave = (tokens: Token[]): SaveCustomTokenWithKey[] =>
	tokens.reduce<SaveCustomTokenWithKey[]>((acc, token) => {
		const normalizedToken = normaliseTokenForSave(token);

		if (nonNullish(normalizedToken)) {
			acc.push(normalizedToken);
		}

		return acc;
	}, []);

export const saveAllCustomTokens = async ({
	tokens,
	progress,
	modalNext,
	onSuccess,
	onError,
	$authIdentity,
	$i18n
}: {
	tokens: Token[];
	progress?: (step: ProgressStepsAddToken) => ProgressStepsAddToken;
	modalNext?: () => void;
	onSuccess?: () => void;
	onError?: () => void;
	$authIdentity: OptionIdentity;
	$i18n: I18n;
}): Promise<void> => {
	const tokensWithKey = normalizeTokensForSave(tokens);

	if (tokensWithKey.length === 0) {
		toastsShow({
			text: $i18n.tokens.manage.info.no_changes,
			level: 'info',
			duration: 5000
		});

		return;
	}

	await saveCustomTokensWithKey({
		tokens: tokensWithKey,
		progress,
		modalNext,
		onSuccess,
		onError,
		identity: $authIdentity
	});
};

export const filterTokensByNft = ({
	tokens,
	filterNfts
}: {
	tokens: Token[];
	filterNfts?: boolean;
}): Token[] =>
	isNullish(filterNfts)
		? tokens
		: tokens.filter((t) => {
				const isNft = isTokenNonFungible(t);
				return filterNfts ? isNft : !isNft;
			});

export const assertExistingTokens = <T extends Token>({
	existingTokens,
	token,
	errorMsg
}: {
	existingTokens: T[];
	token: Omit<T, 'id'>;
	errorMsg: string;
}): { valid: boolean } => {
	if (
		nonNullish(
			existingTokens.find(({ symbol }) => symbol.toLowerCase() === token.symbol.toLowerCase())
		)
	) {
		toastsError({
			msg: { text: errorMsg }
		});

		return { valid: false };
	}

	return { valid: true };
};

/**
 * Returns the path to a token icon stored in the codebase.
 *
 * Icons are organised in the `static` folder **per network and per identifier**.
 * The identifier is network-specific (for example, the token address
 * for ERC-20 and SPL tokens), resulting in paths of the form:
 *
 * `icons/{network}/{identifier}.{extension}`
 *
 * Supported token types include:
 * - All EVM-compatible ERC-20 tokens
 * - Solana SPL tokens
 *
 * Address matching follows **network-specific case-sensitiveness rules**:
 * - Case-sensitive networks use the address as-is
 * - Case-insensitive networks use the lower-cased address
 *
 * For unsupported token
 * types, this function returns `undefined`.
 *
 * @template T - A token type extending {@link Token}
 *
 * @param params
 * @param params.token - A token object containing network information
 * and a valid address. The address must match the network’s addressing
 * rules in order for the icon to resolve correctly.
 * @param params.extension - Optional file extension for the icon asset.
 * Defaults to `'webp'`.
 *
 * @returns The relative icon path
 * (e.g. `/icons/eth/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.webp`)
 * or `undefined` if the token type is not supported.
 */
export const getCodebaseTokenIconPath = <T extends Token>({
	token,
	extension = 'webp'
}: {
	token: T;
	extension?: 'webp' | 'svg' | 'png';
}): string | undefined => {
	if (isTokenErc20(token) || isTokenSpl(token)) {
		const {
			address,
			network: { id: networkId }
		} = token;

		const isCaseSensitive = getCaseSensitiveness({ networkId });

		const identifier = isCaseSensitive ? address : address.toLowerCase();

		const networkSymbol = networkId.description
			?.toLowerCase()
			.trim()
			.replace(/\s+/g, '-') // spaces → -
			.replace(/[^a-z0-9-]/g, '') // drop everything else
			.replace(/-+/g, '-'); // collapse multiple -

		return `/icons/${networkSymbol}/${identifier}.${extension}`;
	}
};
