import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { mapTokenUi } from '$lib/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Sorts tokens by name and network name, pinning the specified ones at the top of the list in the order they are provided.
 *
 * @param $tokens - The list of tokens to sort.
 * @param $tokensToPin - The list of tokens to pin at the top of the list.
 */
export const sortTokens = <T extends Token>({
	$tokens,
	$tokensToPin
}: {
	$tokens: T[];
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
		...otherTokens.sort(
			(a, b) => a.name.localeCompare(b.name) || a.network.name.localeCompare(b.network.name)
		)
	];
};

/**
 * Pins tokens by balance and name.
 *
 * The function pins on top of the list the tokens that have a balance.
 * It sorts first the ones that have non-null balance (descending).
 * Then, it leaves the rest of the tokens untouched.
 * In case of a tie, it sorts by token name and network name.
 *
 * @param $tokens - The list of tokens to sort.
 * @param $balancesStore - The balances data for the tokens.
 * @returns The sorted list of tokens.
 *
 */
export const pinTokensWithBalanceAtTop = ({
	$tokens,
	$balances
}: {
	$tokens: Token[];
	$balances: CertifiedStoreData<BalancesData>;
}): TokenUi[] => {
	// If balances data are nullish, there is no need to sort.
	if (isNullish($balances)) {
		return $tokens.map((token) => mapTokenUi({ token, $balances }));
	}

	const [positiveBalances, nonPositiveBalances] = $tokens.reduce<[TokenUi[], TokenUi[]]>(
		(acc, token) => {
			const tokenUI: TokenUi = mapTokenUi({
				token,
				$balances
			});

			return (tokenUI.balance ?? ZERO).gt(0)
				? [[...acc[0], tokenUI], acc[1]]
				: [acc[0], [...acc[1], tokenUI]];
		},
		[[], []]
	);

	return [
		...positiveBalances.sort(
			(a, b) =>
				Number(b.formattedBalance ?? 0) - Number(a.formattedBalance ?? 0) ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
		),
		...nonPositiveBalances
	];
};

/** Pins enabled tokens at the top of the list, preserving the order of the parts.
 *
 * @param $tokens - The list of tokens.
 * @returns The list of tokens with enabled tokens at the top.
 * */
export const pinEnabledTokensAtTop = <T extends Token>(
	$tokens: TokenToggleable<T>[]
): TokenToggleable<T>[] => $tokens.sort(({ enabled: a }, { enabled: b }) => Number(b) - Number(a));
