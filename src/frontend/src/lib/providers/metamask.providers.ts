import type {
	MetamaskAccounts,
	MetamaskSendTransactionRequestParams,
	MetamaskTransactionHash
} from '$lib/types/metamask';
import type { BigNumber } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

// Documentation: https://docs.metamask.io/wallet/how-to/send-transactions/

export const metamaskAccounts = (): Promise<MetamaskAccounts> =>
	window.ethereum.request({ method: 'eth_requestAccounts' });

export const sendMetamaskTransaction = ({
	value,
	...rest
}: Omit<MetamaskSendTransactionRequestParams, 'value'> & {
	value: BigNumber;
}): Promise<MetamaskTransactionHash> =>
	window.ethereum.request({
		method: 'eth_sendTransaction',
		params: [
			{
				...rest,
				value: Utils.hexlify(value).toString()
			}
		]
	});
