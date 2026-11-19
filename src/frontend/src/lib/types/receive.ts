import type { BtcAddress } from '$btc/types/address';
import type { EthAddress } from '$eth/types/address';
import type { BtcAddressData } from '$icp/stores/btc.store';
import type { AddressStoreData } from '$lib/stores/address.store';
import type { Network } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import type { Token, TokenId } from '$lib/types/token';
import type { SolAddress } from '$sol/types/address';
import type { XrpAddress } from '$xrp/types/address';

export interface ReceiveQRCode {
	address: string;
	addressLabel?: string;
	addressToken: Token;
	qrCodeAriaLabel?: string;
	copyAriaLabel: string;
	// What the address is for, beside its QR code: the networks that share the EVM address, or when
	// to use the ICP Principal or the Account ID.
	description?: string;
}

export type ReceiveQRCodeAction =
	| {
			enabled: true;
			ariaLabel: string;
			testId?: string;
			onClick: () => void;
			// Focused when shown, such as on returning from the QR code it opened.
			autofocus?: boolean;
	  }
	| { enabled: false };

// Where the destination of a route comes from. The route's exact network picks the store.
export type ReceiveAddressKind = 'icp' | 'icrc' | 'evm' | 'btc' | 'sol' | 'xrp' | 'ckbtc-deposit';

// A direct transfer credits what the sender sends; a deposit is converted into the credited asset.
export type ReceiveRouteKind = 'direct' | 'ckbtc-deposit';

export interface ReceiveRoute {
	// Stable across store reloads: built from the networks and asset identifiers, never a TokenId.
	key: string;
	kind: ReceiveRouteKind;
	// The asset the sender sends, on the network they send it on.
	sourceToken: Token;
	sourceNetwork: Network;
	// The asset OISY credits: what gets enabled and where its activity lives.
	creditedToken: Token;
	addressKind: ReceiveAddressKind;
}

// One entry of the token picker: a single exact token, or the versions of one asset on several
// networks that Receive recognises as the same asset.
export interface ReceiveAsset {
	key: string;
	tokens: Token[];
	// The version shown in the list: the one on the preferred network, else the first.
	token: Token;
}

export type ReceiveIcpAddressFormat = 'principal' | 'account-id';

// How an address is named next to it, on its Copy button, and once copied.
export interface ReceiveAddressTexts {
	label: string;
	copyAriaLabel: string;
	copiedText: string;
}

export type ReceiveAddressState =
	{ status: 'loading' } | { status: 'error' } | { status: 'ready'; address: string };

// What the conversion instructions opened from Receive convert: the exact Ethereum twin into the
// exact ck token.
export interface ReceiveHowToConvertData {
	sourceToken: Token;
	destinationToken: Token;
}

// The stores Receive reads addresses from, for the signed-in account.
export interface ReceiveAddressSources {
	icrcAddress: OptionString;
	icpAccountId: OptionString;
	evm: AddressStoreData<EthAddress>;
	btcMainnet: AddressStoreData<BtcAddress>;
	btcTestnet: AddressStoreData<BtcAddress>;
	btcRegtest: AddressStoreData<BtcAddress>;
	solMainnet: AddressStoreData<SolAddress>;
	solDevnet: AddressStoreData<SolAddress>;
	solLocal: AddressStoreData<SolAddress>;
	xrpMainnet: AddressStoreData<XrpAddress>;
	// The ckBTC minter's Bitcoin deposit addresses, by ckBTC token.
	ckBtcDeposit: Record<TokenId, BtcAddressData | null> | undefined;
}

// The sources that hold one address per network, each loaded by its own service.
export type ReceiveNetworkAddressSource = keyof Pick<
	ReceiveAddressSources,
	| 'evm'
	| 'btcMainnet'
	| 'btcTestnet'
	| 'btcRegtest'
	| 'solMainnet'
	| 'solDevnet'
	| 'solLocal'
	| 'xrpMainnet'
>;
