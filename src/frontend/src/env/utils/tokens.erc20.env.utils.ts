import type { EnvTokens } from '$env/types/env-token-ckerc20';
import type { EnvTokenErc20 } from '$env/types/env-token-erc20';
import type { RequiredErc20Token } from '$eth/types/erc20';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Map the ERC20 twin tokens for the Ethereum network based on the environment tokens, using the symbol as the key to map the information.
 *
 * e.g. USDC === (ck)USDC
 */
export const mapErc20TwinToken = ({
	token: { symbol, ...rest },
	ckErc20Tokens
}: {
	token: EnvTokenErc20;
	ckErc20Tokens: EnvTokens;
}): RequiredErc20Token | undefined => {
	const contractAddress = Object.keys(ckErc20Tokens).find(
		(key) => key.replace('ck', '') === symbol
	);

	if (isNullish(contractAddress)) {
		return undefined;
	}

	return {
		symbol,
		...rest,
		address: contractAddress
	};
};

export const mapOptionalErc20TwinToken = (params: {
	token: EnvTokenErc20;
	ckErc20Tokens: EnvTokens;
}): RequiredErc20Token[] => {
	const mappedToken = mapErc20TwinToken(params);
	return nonNullish(mappedToken) ? [mappedToken] : [];
};
