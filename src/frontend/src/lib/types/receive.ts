import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';

export interface ReceiveQRCode {
	address: string;
	addressLabel?: string;
	addressToken: Token;
	qrCodeAriaLabel?: string;
	copyAriaLabel: string;
	// The networks that share the address, listed beside its QR code (the shared EVM address).
	networks?: Network[];
}

export type ReceiveQRCodeAction =
	{ enabled: true; ariaLabel: string; testId?: string; onClick: () => void } | { enabled: false };

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

export type ReceiveAddressState =
	{ status: 'loading' } | { status: 'error' } | { status: 'ready'; address: string };

// What the conversion instructions opened from Receive convert: the exact Ethereum twin into the
// exact ck token.
export interface ReceiveHowToConvertData {
	sourceToken: Token;
	destinationToken: Token;
}
