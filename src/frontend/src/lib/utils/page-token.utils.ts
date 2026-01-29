import { isTokenErc } from '$eth/utils/erc.utils';
import { isTokenIcNft } from '$icp/utils/ic-nft.utils';
import { isTokenIc } from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';
import { isTokenSpl } from '$sol/utils/spl.utils';

export const getPageTokenIdentifier = (token: Token): string =>
	isTokenErc(token) || isTokenSpl(token)
		? token.address
		: isTokenIc(token)
			? token.ledgerCanisterId
			: isTokenIcNft(token)
				? token.canisterId
				: token.symbol;
