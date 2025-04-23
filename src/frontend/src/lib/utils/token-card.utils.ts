import type { CardData } from '$lib/types/token-card';
import type { TokenUiGroup } from '$lib/types/token-group';
import { nonNullish } from '@dfinity/utils';

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
	icon: nonNullish(tokens[0]?.groupData?.icon) ? tokens[0].groupData.icon : icon, // TODO: this can be directly the prop of TokenUiGroup type
	network,
	oisyName: { oisyName: tokens.map((token) => token.symbol).join(', ') },
	oisySymbol: { oisySymbol: name },
	balance,
	usdBalance,
	tokenCount: tokens.length,
	groupData: tokens[0]?.groupData // TODO: this can be directly the prop of TokenUiGroup type
});
