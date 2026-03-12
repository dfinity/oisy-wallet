import type { TokenUi } from '$lib/types/token-ui';

/**
 * Compares two TokenUi arrays by id, balance, and USD balance.
 * Prevents re-renders when balance updates for tokens outside the current view
 * produce an identical mapped result.
 */
// eslint-disable-next-line local-rules/prefer-object-params
export const tokenUiListEqual = (a: TokenUi[], b: TokenUi[]): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((item, i) => {
		const other = b[i];
		return (
			item.id === other.id && item.balance === other.balance && item.usdBalance === other.usdBalance
		);
	});
};
