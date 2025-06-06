import type { CardData } from '$lib/types/token-card';
import type { TokenUiGroup } from '$lib/types/token-group';

/** Maps the token group to the card data of the card that will be used as "summary" for the group.
 *
 * @param {TokenUiGroup} tokenGroup The token group to map
 * @returns {CardData} The card data for the token group
 */
export const mapHeaderData = ({
	groupData: { name, symbol, icon },
	tokens,
	decimals,
	balance,
	usdBalance
}: TokenUiGroup): CardData => ({
	name,
	symbol,
	decimals,
	icon,
	oisyName: { oisyName: tokens.map((token) => token.symbol).join(', ') },
	oisySymbol: { oisySymbol: symbol },
	balance,
	usdBalance,
	tokenCount: tokens.length
});
