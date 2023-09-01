//https://docs.metamask.io/wallet/reference/eth_requestaccounts/
export interface MetamaskResponseError {
    code: number,
    message: string,
    stack: string
}

// copied from https://github.com/MetaMask/providers/blob/6206aada4b1a8c14912fc9b0fcd0ec922d41251b/src/BaseProvider.ts#L46
export type RequestArguments = {
    /** The RPC method to request. */
    method: string;

    /** The params of the RPC method, if any. */
    params?: unknown[] | Record<string, unknown>;
}
