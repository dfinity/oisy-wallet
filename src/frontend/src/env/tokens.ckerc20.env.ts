import ckErc20Tokens from '$env/tokens.ckerc20.json';
import { envTokensCkErc20 } from '$icp/types/env-token-ckerc20';

const ckErc20 = envTokensCkErc20.safeParse(ckErc20Tokens);

export const { production: ckErc20Production, staging: ckErc20Staging } = ckErc20.success
	? ckErc20.data
	: { production: {}, staging: {} };
