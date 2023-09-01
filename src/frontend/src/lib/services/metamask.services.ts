import type { MetamaskResponseError, RequestArguments } from '$lib/types/metamask';
import { addressStore } from '$lib/stores/address.store';
import { toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';


// https://docs.metamask.io/wallet/reference/eth_requestaccounts/
const isMetamaskResponseError = (object: any): object is MetamaskResponseError => {
    return 'code' in object && 'message' in object && 'stack' in object;
};

const metamaskRequest = async (requestParams: RequestArguments): Promise<{ success: boolean, response: string | string[] | null }> => {
    let response = null;

    try {
        response = await window.ethereum.request(requestParams);
    } catch (err) {
        if (isMetamaskResponseError(err) && err.code === 4001) {
            // EIP-1193 userRejectedRequest error
            toastsError({
                msg: { text: 'Metamask operation rejected.' }
            });
        } else {
            toastsError({
                msg: { text: 'Unknown Metamask error.' }
            });
        }
        return { success: false, response: null };
    }
    return { success: true, response };
};

export const requestMetamaskAccounts = async (): Promise<{ success: boolean, accounts: string[] | null }> => {
    const { success, response } = await metamaskRequest({ method: 'eth_requestAccounts' });

    return { success, accounts: (response as string[] | null) };
};

export const sendMetamaskTransaction = async ({
    fromAccount
}: { fromAccount: string | null }): Promise<{ success: boolean, transactionHash: string | null }> => {
    const address = get(addressStore);

    const { success, response } = await metamaskRequest({
        method: 'eth_sendTransaction',
        params: [
            {
                from: fromAccount,
                to: address
            }
        ]
    });
    return { success, transactionHash: (response as string | null) };
};
