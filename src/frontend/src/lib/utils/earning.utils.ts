import { ZERO } from '$lib/constants/app.constants';
import type { TokenId } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import { isNullish } from '@dfinity/utils';

// The best top rate among the tokens the user holds, for the tag beside a token or a token group;
// undefined when they hold none that has one.
export const heldTopRateApy = ({
	tokens,
	apyByTokenId
}: {
	tokens: TokenUi[];
	apyByTokenId: Map<TokenId, number>;
}): number | undefined =>
	tokens.reduce<number | undefined>((best, { id, balance }) => {
		const apy = apyByTokenId.get(id);

		if (isNullish(apy) || isNullish(balance) || balance <= ZERO) {
			return best;
		}

		return isNullish(best) || apy > best ? apy : best;
	}, undefined);
