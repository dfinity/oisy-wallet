import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic-token';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

type IcTokenInput = Omit<Partial<IcToken>, 'ledgerCanisterId'> &
	Required<Pick<IcToken, 'ledgerCanisterId'>>;

export const buildIndexedIcTokens = <T extends IcTokenInput>(
	tokens: T[]
): Record<LedgerCanisterIdText, T> =>
	tokens.reduce<Record<LedgerCanisterIdText, T>>((acc, { ledgerCanisterId, ...rest }) => {
		acc[`${ledgerCanisterId}`] = {
			ledgerCanisterId,
			...rest
		} as T;

		return acc;
	}, {});

/**
 * One display label per ledger, unambiguous within the given set.
 *
 * A custom ledger is free to claim any symbol, so a symbol alone cannot identify a ledger. Each
 * token is labelled with its display symbol, and where a *different* ledger in the set shares
 * that symbol, the label is suffixed with the shortened ledger id - the one field an impersonating
 * token cannot copy. The same ledger listed twice (a default that is also an enabled custom
 * token) is not a collision.
 *
 * Callers that show a token in several places must build the labels once, over the whole set the
 * user can encounter, and pass them down: computed per surface, a filtered list can lose the twin
 * and label an impostor as though it were unique.
 */
export const buildIcTokenLabels = (tokens: IcToken[]): Map<LedgerCanisterIdText, string> => {
	const ledgersBySymbol = tokens.reduce<Map<string, Set<LedgerCanisterIdText>>>((acc, token) => {
		const symbol = getTokenDisplaySymbol(token);

		return acc.set(symbol, (acc.get(symbol) ?? new Set()).add(token.ledgerCanisterId));
	}, new Map());

	return tokens.reduce<Map<LedgerCanisterIdText, string>>((acc, token) => {
		const symbol = getTokenDisplaySymbol(token);
		const ambiguous = (ledgersBySymbol.get(symbol)?.size ?? 0) > 1;

		return acc.set(
			token.ledgerCanisterId,
			ambiguous
				? `${symbol} (${shortenWithMiddleEllipsis({ text: token.ledgerCanisterId })})`
				: symbol
		);
	}, new Map());
};
