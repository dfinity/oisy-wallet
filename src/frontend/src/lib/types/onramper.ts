import type { BtcAddress } from '$btc/types/address';
import type { EthAddress } from '$eth/types/address';
import type { Currency } from '$lib/enums/currency';
import type {
	OnramperIdSchema,
	OnramperNetworkIdSchema,
	OnramperSupportedCryptoSchema
} from '$lib/schema/onramper.schema';
import type * as z from 'zod';

export type OnramperNetworkId = z.infer<typeof OnramperNetworkIdSchema>;

export type OnramperId = z.infer<typeof OnramperIdSchema>;

export type OnramperTransactionType = 'buy' | 'sell';

export type OnramperSupportedCrypto = z.infer<typeof OnramperSupportedCryptoSchema>;

// OnRamper's id of each token in one of its lists, keyed by network and address.
export type OnramperIdsByAddress = Map<string, OnramperId>;

// A list that could not be loaded is missing.
export type OnramperIds = Record<OnramperTransactionType, OnramperIdsByAddress | undefined>;

// The lists while they load. Each settles on its own and never rejects.
export type OnramperIdsLoading = Record<
	OnramperTransactionType,
	Promise<OnramperIdsByAddress | undefined>
>;

// The list of fiat currencies that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/fiat-currency-support
// Please, cross-reference the OISY supported currencies with the Coingecko API for supported currencies.
export type OnramperFiatId = Currency;

// OnRamper's `mode` is a comma-separated list; the order sets the order of the widget's tabs.
export type OnramperMode = 'buy' | 'buy,sell';

export type OnramperPaymentMethodId = 'creditcard';

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
