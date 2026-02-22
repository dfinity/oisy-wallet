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
import { isIcCkToken, isIcToken } from '$icp/validation/ic-token.validation';
import { LOCAL, ZERO } from '$lib/constants/app.constants';
import type { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { saveCustomTokensWithKey } from '$lib/services/manage-tokens.services';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import type { ExchangesData } from '$lib/types/exchange';
import type { OptionIdentity } from '$lib/types/identity';
import type { StakeBalances } from '$lib/types/stake-balance';
import type { Token, TokenId, TokenToPin } from '$lib/types/token';
import type { TokensTotalUsdBalancePerNetwork } from '$lib/types/token-balance';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { TokenUi } from '$lib/types/token-ui';
import type { UserNetworks } from '$lib/types/user-networks';
import { areAddressesPartiallyEqual, getCaseSensitiveness } from '$lib/utils/address.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdSOLDevnet } from '$lib/utils/network.utils';
import { isTokenNonFungible } from '$lib/utils/nft.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { filterEnabledToken, mapTokenUi } from '$lib/utils/token.utils';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
import { isTokenSpl, isTokenSplCustomToken } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Maps tokens to their UI representation and sorts them using balance-aware and pin-aware prioritisation.
 *
 * Sorting priority (in order):
 *
 * 1. Deprecation status (non-deprecated tokens first).
 * 2. USD balance (descending).
 * 3. Explicitly pinned tokens (pinned first, preserving the order provided in `$tokensToPin`).
 * 4. Token symbol (ascending, locale-aware).
 * 5. Token name (ascending, locale-aware).
 * 6. Network name (ascending, locale-aware).
 * 7. Token balance (descending).
 * 8. USD market cap (descending).
 *
 * @param $tokens - The list of tokens to map and sort.
 * @param $balances - Certified balances data used to compute token balances.
 * @param $stakeBalances - Staked balances used in the UI mapping.
 * @param $exchanges - Exchange rate data used to compute USD balance and market cap.
 * @param $tokensToPin - Tokens that should be prioritised after balance and deprecation rules.
 * @returns A sorted array of mapped token UI objects.
 */
export const sortTokens = <T extends Token>({
	$tokens,
	$balances,
	$stakeBalances,
	$exchanges,
	$tokensToPin
}: {
	$tokens: T[];
	$balances: CertifiedStoreData<BalancesData>;
	$stakeBalances: StakeBalances;
	$exchanges: ExchangesData;
	$tokensToPin: TokenToPin[];
}): TokenUi<T>[] => {
	const pinIndexById = new Map<TokenId, number>($tokensToPin.map(({ id }, index) => [id, index]));

	const tokens = $tokens.map((token) =>
		mapTokenUi({ token, $balances, $stakeBalances, $exchanges })
	);

	return tokens.sort((a, b) => {
		// Deprecated last
		const aDeprecated = isIcToken(a) && (a.deprecated ?? false);
		const bDeprecated = isIcToken(b) && (b.deprecated ?? false);
		if (aDeprecated !== bDeprecated) {
			return aDeprecated ? 1 : -1;
		}

		// USD Balance descending
		const usdBalanceDiff = (b.usdBalance ?? 0) - (a.usdBalance ?? 0);
		if (usdBalanceDiff !== 0) {
			return usdBalanceDiff;
		}

		// Pinned tokens (pinned first; pinned order = order provided)
		const aPin = pinIndexById.get(a.id);
		const bPin = pinIndexById.get(b.id);
		const aPinned = aPin !== undefined;
		const bPinned = bPin !== undefined;
		if (aPinned !== bPinned) {
			return aPinned ? -1 : 1;
		}
		if (aPinned && bPinned) {
			return aPin - bPin;
		}

		return (
			a.symbol.localeCompare(b.symbol) ||
			a.name.localeCompare(b.name) ||
			a.network.name.localeCompare(b.network.name) ||
			+((b.balance ?? ZERO) > (a.balance ?? ZERO)) - +((b.balance ?? ZERO) < (a.balance ?? ZERO)) ||
			($exchanges[b.id]?.usd_market_cap ?? 0) - ($exchanges[a.id]?.usd_market_cap ?? 0)
		);
	});
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
