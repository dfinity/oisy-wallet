import { isTokenErc } from '$eth/utils/erc.utils';
import { isTokenIcNft } from '$icp/utils/ic-nft.utils';
import { isTokenIc } from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isTokenXrpTrustLine, xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';

export const getTokenIdentifier = <T extends Token>(token: T): string | undefined => {
	if (isTokenErc(token) || isTokenSpl(token)) {
		return token.address;
	}

	if (isTokenIc(token)) {
		return token.ledgerCanisterId;
	}

	if (isTokenIcNft(token)) {
		return token.canisterId;
	}

	if (isTokenXrpTrustLine(token)) {
		return xrpTrustLineIdentifier(token);
	}
};
