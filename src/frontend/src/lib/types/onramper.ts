import type { BtcAddress } from '$btc/types/address';
import type { EthAddress } from '$eth/types/address';
import type { Currency } from '$lib/enums/currency';
import type { OnramperIdSchema, OnramperNetworkIdSchema } from '$lib/schema/onramper.schema';
import type * as z from 'zod';

export type OnramperNetworkId = z.infer<typeof OnramperNetworkIdSchema>;

export type OnramperId = z.infer<typeof OnramperIdSchema>;

// The list of fiat currencies that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/fiat-currency-support
// Please, cross-reference the OISY supported currencies with the Coingecko API for supported currencies.
export type OnramperFiatId = Currency;

export type OnramperMode = 'buy';

// TODO: refine the type for IC/ICRC address to be more clear
export type OnramperWalletAddress = BtcAddress | EthAddress | string;

export interface OnramperCryptoWallet {
	cryptoId: OnramperId;
	wallet: OnramperWalletAddress;
}

export interface OnramperNetworkWallet {
	networkId: OnramperNetworkId;
	wallet: OnramperWalletAddress;
}
