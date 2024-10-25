import type { TokenUiGroup } from '$lib/types/token';
import type { CardData } from '$lib/types/token-card';

/** Maps the token group to the card data of the card that will be used as "summary" for the group.
 *
 * @param {TokenUiGroup} tokenGroup The token group to map
 * @returns {CardData} The card data for the token group
 */
export const mapHeaderData = ({
	nativeToken: { name, symbol, decimals, icon, network },
	tokens,
	balance,
	usdBalance
}: TokenUiGroup): CardData => ({
	name,
	symbol,
	decimals,
	icon,
	network,
	oisyName: { oisyName: tokens.map((token) => token.symbol).join(', ') },
	oisySymbol: { oisySymbol: name },
	balance: balance,
	usdBalance: usdBalance,
	tokenCount: tokens.length
});
