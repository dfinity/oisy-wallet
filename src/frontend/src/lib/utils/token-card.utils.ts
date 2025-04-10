import type { CardData } from '$lib/types/token-card';
import type { TokenUiGroup } from '$lib/types/token-group';

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
}: TokenUiGroup): CardData => {
	const ret = {
		name,
		symbol,
		decimals,
		icon,
		network,
		oisyName: { oisyName: tokens.map((token) => token.symbol).join(', ') },
		oisySymbol: { oisySymbol: name },
		balance,
		usdBalance,
		tokenCount: tokens.length
	};

	// if the native tokens network is disabled, we dont want to display ck icon, symbol and name
	const nonCkTokens = tokens.filter((token) => token.symbol.indexOf('ck') < 0);
	if (tokens[0].symbol.indexOf('ck') === 0 && nonCkTokens.length > 0) {
		return {
			...ret,
			symbol: nonCkTokens[0].symbol,
			icon: nonCkTokens[0].icon,
			name: nonCkTokens[0].name
		};
	}

	return ret;
};
