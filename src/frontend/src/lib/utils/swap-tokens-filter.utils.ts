import { isTokenErcFungible } from '$eth/utils/erc-fungible.utils';
import { isTokenEthereumNative } from '$eth/utils/token.utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
import type {
	SwapProviderListCoverage,
	SwapProviderSupport,
	SwapSupportedTokensData,
	SwapSupportedTokensInfo
} from '$lib/stores/swap-supported-tokens.store';
import type { Network, NetworkId } from '$lib/types/network';
import type { SwapProvider, SwapTokenCategory } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isTokenSolanaNative } from '$sol/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const determineCoverage = ({
	totalEnabled,
	withList
}: {
	totalEnabled: number;
	withList: number;
}): SwapProviderListCoverage => {
	if (totalEnabled === 0 || withList === 0) {
		return 'none';
	}

	return withList >= totalEnabled ? 'all' : 'some';
};

interface SwapTokenLookup {
	info: SwapSupportedTokensInfo | undefined;
	identifier: string;
	category: SwapTokenCategory;
}

/**
 * Resolves the provider-group info and the token identifier used for matching
 * against provider supported-token sets.
 *
 * Returns `undefined` when the token doesn't belong to a known swap network.
 */
export const resolveSwapTokenLookup = ({
	token,
	supportedData
}: {
	token: Token;
	supportedData?: SwapSupportedTokensData;
}): SwapTokenLookup | undefined => {
	if (isIcToken(token)) {
		return {
			info: supportedData?.icp,
			identifier: token.ledgerCanisterId,
			category: 'icp'
		};
	}

	if (isTokenErcFungible(token)) {
		return {
			info: supportedData?.evm,
			identifier: token.address.toLowerCase(),
			category: 'evm'
		};
	}

	if (isTokenSpl(token)) {
		return { info: supportedData?.sol, identifier: token.address, category: 'sol' };
	}

	if (isTokenEthereumNative(token)) {
		return {
			info: supportedData?.evm,
			identifier: token.symbol.toLowerCase(),
			category: 'evm'
		};
	}

	if (isTokenSolanaNative(token)) {
		return {
			info: supportedData?.sol,
			identifier: token.symbol.toLowerCase(),
			category: 'sol'
		};
	}
};

/**
 * Filters swap tokens based on provider supported-token lists.
 *
 * Per network category the rule is:
 * - All providers offer a list  →  S ∩ (A ∪ I)  (only tokens at least one provider supports)
 * - Some providers offer a list →  A ∪ (S ∩ I)  (all active + inactive ones known to be swappable)
 * - No provider offers a list  →  A             (only active tokens)
 *
 * Where:
 * - S  = union of supported tokens across providers that expose a list
 * - A  = active (enabled) tokens
 * - I  = inactive (disabled) tokens
 */
export const filterSwapTokens = <T extends Token>({
	tokens,
	supportedData
}: {
	tokens: TokenToggleable<T>[];
	supportedData: SwapSupportedTokensData | undefined;
}): TokenToggleable<T>[] => {
	if (isNullish(supportedData)) {
		return tokens;
	}

	return tokens.filter((token) => {
		const lookup = resolveSwapTokenLookup({ token, supportedData });

		if (isNullish(lookup) || isNullish(lookup.info)) {
			return token.enabled;
		}

		const { info } = lookup;
		const { coverage, supportedTokenIds } = info;

		if (coverage === 'none') {
			return token.enabled;
		}

		const isSupported = supportedTokenIds.has(lookup.identifier);
		return coverage === 'all' ? isSupported : token.enabled || isSupported;
	});
};

interface CategoryAccum {
	total: number;
	withList: number;
	ids: Set<string>;
}

// A category with no supporting provider for the source is returned as coverage='all' with an
// empty supported set, so filterSwapTokens rejects every token in this category (intersection
// is empty). Each blocked category gets a fresh Set to avoid sharing mutable state.
const toInfo = ({ total, withList, ids }: CategoryAccum): SwapSupportedTokensInfo =>
	total === 0
		? { coverage: 'all', supportedTokenIds: new Set() }
		: {
				coverage: determineCoverage({ totalEnabled: total, withList }),
				supportedTokenIds: ids
			};

/**
 * Aggregates per-provider directed-pair destinations for a given source token,
 * producing data with the same shape as the pay-side `SwapSupportedTokensData`.
 *
 * Each provider's `getSupportedDestinations` returns:
 * - `undefined`: provider does not support the source → skip.
 * - `{}` (empty map): provider supports the source as a wildcard contributor with
 *   no explicit destination list. Bumps the source category's `total` count only,
 *   so the category falls back to coverage='some' / 'none' rules.
 * - `{ icp: Set, evm: Set, ... }`: explicit destinations per category. Each populated
 *   category bumps both `total` and `withList` and unions its IDs.
 *
 * A category with `total === 0` (no provider supports the source there) is returned
 * as coverage='all' + empty supported set, which causes `filterSwapTokens` to drop
 * every token of that category — preserving the directed-pair semantics.
 */
export const computeReceiveSupportedTokens = ({
	sourceToken,
	providers
}: {
	sourceToken: Token;
	providers: SwapProviderSupport[];
}): SwapSupportedTokensData => {
	const accum: Record<SwapTokenCategory, CategoryAccum> = {
		icp: { total: 0, withList: 0, ids: new Set() },
		evm: { total: 0, withList: 0, ids: new Set() },
		sol: { total: 0, withList: 0, ids: new Set() }
	};

	const findProviderSourceTokens = ({
		key,
		category
	}: {
		key: SwapProvider;
		category: SwapTokenCategory;
	}): Set<string> | undefined =>
		providers.find((p) => p.key === key && p.sourceCategory === category)?.supportedSourceTokens;

	for (const provider of providers) {
		const dests = provider.getSupportedDestinations({
			sourceToken,
			supportedSourceTokens: provider.supportedSourceTokens,
			findProviderSourceTokens
		});

		if (nonNullish(dests)) {
			const entries = Object.entries(dests) as [SwapTokenCategory, Set<string>][];

			if (entries.length === 0) {
				accum[provider.sourceCategory].total++;
			} else {
				for (const [category, ids] of entries) {
					accum[category].total++;
					accum[category].withList++;
					ids.forEach((id) => accum[category].ids.add(id));
				}
			}
		}
	}

	return {
		icp: toInfo(accum.icp),
		evm: toInfo(accum.evm),
		sol: toInfo(accum.sol)
	};
};

/**
 * Returns the subset of `networks` that have at least one token in `tokens`
 * passing `filterSwapTokens` against `supportedData`.
 */
export const networksWithSupport = ({
	networks,
	tokens,
	supportedData
}: {
	networks: Network[];
	tokens: TokenToggleable<Token>[];
	supportedData: SwapSupportedTokensData;
}): NetworkId[] => {
	const passingNetworkIds = new Set(
		filterSwapTokens({ tokens, supportedData }).map((t) => t.network.id)
	);

	return networks.filter(({ id }) => passingNetworkIds.has(id)).map(({ id }) => id);
};
