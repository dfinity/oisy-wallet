import type {
	MetamaskAccounts,
	MetamaskChainId,
	MetamaskSendTransactionRequestParams,
	MetamaskTransactionHash
} from '$eth/types/metamask';
import { toBeHex } from 'ethers/utils';

// Documentation: https://docs.metamask.io/wallet/how-to/send-transactions/

export const metamaskAccounts = (): Promise<MetamaskAccounts> =>
	window.ethereum.request({ method: 'eth_requestAccounts' });

export const switchMetamaskChain = (chainId: MetamaskChainId): Promise<null> =>
	window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });

export const sendMetamaskTransaction = ({
	value,
	...rest
}: Omit<MetamaskSendTransactionRequestParams, 'value'> & {
	value: bigint;
}): Promise<MetamaskTransactionHash> =>
	window.ethereum.request({
		method: 'eth_sendTransaction',
		params: [
			{
				...rest,
				value: toBeHex(value).toString()
			}
		]
	});
