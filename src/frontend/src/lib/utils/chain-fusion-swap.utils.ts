import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import type { IcCkInterface, IcCkToken } from '$icp/types/ic-token';
import { isIcCkToken, isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import type {
	ChainFusionFee,
	ChainFusionPair,
	SwapCategorizedTokenIds,
	SwapTokenCategory
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export type CkTokenWithTwin = IcCkToken & Required<Pick<IcCkToken, 'twinToken'>>;

/**
 * `IcCkTokenSchema` marks every ck field optional, so `isIcCkToken` alone accepts
 * any IC token. The `twinToken` check is what actually discriminates a ck token.
 */
const isCkTokenWithTwin = (token: Token): token is CkTokenWithTwin =>
	isIcCkToken(token) && nonNullish(token.twinToken);

/**
 * Builds the ck ↔ native pair table from the curated ck token environment.
 *
 * Testnet twins are dropped: the swap flow is mainnet-only. Duplicate ck ledgers are
 * dropped too, because the curated lists overlap — mainnet ckBTC / ckETH / ckUSDC are
 * defined in `PUBLIC_ICRC_TOKENS` while the remaining mainnet ckERC20 tokens live in
 * `ICRC_CK_ERC20_TOKENS`.
 */
export const toChainFusionPairs = (ckTokens: IcCkInterface[]): ChainFusionPair[] =>
	ckTokens.reduce<ChainFusionPair[]>((acc, { ledgerCanisterId, twinToken }) => {
		if (
			isNullish(twinToken) ||
			twinToken.network.env === 'testnet' ||
			acc.some(({ ckLedgerCanisterId }) => ckLedgerCanisterId === ledgerCanisterId)
		) {
			return acc;
		}

		return [...acc, { ckLedgerCanisterId: ledgerCanisterId, twinToken }];
	}, []);

/**
 * The pairs Chain Fusion may currently offer.
 *
 * This filter, not the flag, is what decides which token families are live: the flag
 * turns the whole provider on, while a family only becomes offerable once its twins
 * pass here. Today that is Ethereum mainnet — exactly where the ckETH / ckERC20 helper
 * contracts are deployed — and the Bitcoin arm is added by widening this one predicate,
 * without reshaping any caller.
 */
const enabledPairs = (pairs: ChainFusionPair[]): ChainFusionPair[] =>
	CHAIN_FUSION_SWAP_ENABLED
		? pairs.filter(({ twinToken }) => twinToken.network.id === ETHEREUM_NETWORK_ID)
		: [];

/**
 * The source tokens Chain Fusion accepts for a category, in
 * {@link resolveSwapTokenLookup}'s identifier space.
 */
export const chainFusionSupportedSourceTokens = ({
	category,
	pairs
}: {
	category: SwapTokenCategory;
	pairs: ChainFusionPair[];
}): Set<string> =>
	enabledPairs(pairs).reduce<Set<string>>((acc, { ckLedgerCanisterId, twinToken }) => {
		if (category === 'icp') {
			return acc.add(ckLedgerCanisterId);
		}

		const lookup = resolveSwapTokenLookup({ token: twinToken });

		return nonNullish(lookup) && lookup.category === category ? acc.add(lookup.identifier) : acc;
	}, new Set());

/**
 * The directed destinations Chain Fusion can convert the given source token to, the
 * direct analogue of `oneSecCompatibleDestinations`.
 *
 * `undefined` means "Chain Fusion imposes no restriction here", which the aggregation
 * reads as "this provider does not support this source" — so it must not be confused
 * with an empty set.
 */
export const chainFusionCompatibleDestinations = ({
	sourceToken,
	pairs
}: {
	sourceToken: Token;
	pairs: ChainFusionPair[];
}): SwapCategorizedTokenIds | undefined => {
	const enabled = enabledPairs(pairs);

	if (isIcToken(sourceToken)) {
		const pair = enabled.find(
			({ ckLedgerCanisterId }) => ckLedgerCanisterId === sourceToken.ledgerCanisterId
		);

		if (isNullish(pair)) {
			return;
		}

		const lookup = resolveSwapTokenLookup({ token: pair.twinToken });

		return nonNullish(lookup) ? { [lookup.category]: new Set([lookup.identifier]) } : undefined;
	}

	const pair = enabled.find(({ twinToken }) => twinToken.id === sourceToken.id);

	return nonNullish(pair) ? { icp: new Set([pair.ckLedgerCanisterId]) } : undefined;
};

/**
 * `ckToken` back again when it really is the ck counterpart of `nativeToken`, otherwise
 * `undefined`.
 *
 * Directed on purpose: a quote has to know *which* way round the pair sits, since a mint
 * puts the ck token on the destination side and a withdrawal on the source side. Callers
 * pass the two tokens they already hold; no token list is needed to decide.
 *
 * It hands the token back rather than a boolean so callers also get the narrowed,
 * `twinToken`-bearing type — a `ckToken is …` predicate is not an option, because a type
 * predicate has to name a parameter and the params here are an object.
 *
 * Anchored on `twinToken.id`, never on the symbol: `findTwinToken` matches
 * `twinTokenSymbol`, and USDC / LINK / native ETH all exist on Base and Arbitrum as well
 * as Ethereum mainnet, where the ck helper contracts cannot settle. Token ids are unique
 * symbols, so an id match pins the exact network — and a user-imported duplicate of a
 * curated ERC20, which gets a fresh id, safely matches nothing.
 */
export const asCkTwinOf = ({
	ckToken,
	nativeToken
}: {
	ckToken: Token;
	nativeToken: Token;
}): CkTokenWithTwin | undefined =>
	isCkTokenWithTwin(ckToken) && ckToken.twinToken.id === nativeToken.id ? ckToken : undefined;

/**
 * A ck conversion is 1:1, so the received amount is the source amount less only the
 * fees the minter actually takes out of it — see `ChainFusionFee.deductedFromAmount`.
 * Fees charged on top, such as a ck ledger fee, are itemized below the form and must
 * not move this number. Saturating, like `computeReceiveAmount` in `onesec-swap.utils`.
 */
export const computeChainFusionReceiveAmount = ({
	amount,
	sourceFees
}: {
	amount: bigint;
	sourceFees: ChainFusionFee[];
}): bigint => {
	const totalFee = sourceFees.reduce(
		(acc, { fee, deductedFromAmount }) => (deductedFromAmount === true ? acc + fee : acc),
		ZERO
	);

	return amount > totalFee ? amount - totalFee : ZERO;
};
