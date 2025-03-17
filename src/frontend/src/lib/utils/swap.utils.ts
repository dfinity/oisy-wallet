import type {SwapAmountsTxReply} from "$declarations/kong_backend/kong_backend.did";
import type {ProviderFee} from "$lib/types/swap";

export const getSwapRoute = (transactions: SwapAmountsTxReply[]): string[] => {
    let swapRoute: string[] = [];
    if (transactions.length === 0) {
        return swapRoute;
    }

    swapRoute.push(transactions[0].pay_symbol);
    transactions.forEach((transaction) => {
        swapRoute.push(transaction.receive_symbol);
    })

    return swapRoute;
}

export const getLiquidityFees = (transactions: SwapAmountsTxReply[]): ProviderFee[] => {
    let liquidityFees: ProviderFee[] = [];
    if (transactions.length === 0) {
        return liquidityFees;
    }

    transactions.forEach((transaction) => {
        liquidityFees.push({
            fee: transaction.lp_fee,
            symbol: transaction.receive_symbol
        });
    });

    return liquidityFees;
}

export const getNetworkFee = (transactions: SwapAmountsTxReply[]): ProviderFee | undefined => {
    if (transactions.length === 0) {
        return undefined
    }

    return {
        fee: transactions.reduce((acc, {gas_fee}) => acc + gas_fee, BigInt(0)),
        symbol: transactions[transactions.length - 1].receive_symbol
    }
}