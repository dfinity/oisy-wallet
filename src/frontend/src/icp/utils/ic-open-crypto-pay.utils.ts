import type { IcToken } from '$icp/types/ic-token';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import type { NetworkOpenCryptoPay } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { PrincipalText } from '@dfinity/zod-schemas';

export const isIcPayableToken = (token: Token): token is IcToken =>
	isTokenIcp(token) || isTokenIcrc(token);

export const getIcPaymentUri = ({
	callback,
	quoteId,
	network,
	asset,
	sender
}: {
	callback: string;
	quoteId: string;
	network: NetworkOpenCryptoPay;
	asset: string;
	sender: PrincipalText;
}): string => {
	const apiUrl = callback.replace('cb', 'tx');

	return `${apiUrl}?quote=${quoteId}&method=${network}&asset=${asset}&sender=${sender}`;
};
