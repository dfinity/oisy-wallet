import type {
	MetamaskAccounts,
	MetamaskSendTransactionRequestParams,
	MetamaskTransactionHash
} from '$lib/types/metamask';

// Documentation: https://docs.metamask.io/wallet/how-to/send-transactions/

export const metamaskAccounts = (): Promise<MetamaskAccounts> =>
	window.ethereum.request({ method: 'eth_requestAccounts' });

export const sendMetamaskTransaction = (
	params: MetamaskSendTransactionRequestParams
): Promise<MetamaskTransactionHash> =>
	window.ethereum.request({
		method: 'eth_sendTransaction',
		params: [params]
	});
