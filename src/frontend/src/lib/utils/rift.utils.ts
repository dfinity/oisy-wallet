import { isBitcoinToken } from '$btc/utils/token.utils';
import { RIFT_BTC_ASSET_ID, RIFT_EVM_NATIVE_ASSETS } from '$env/rest/rift.env';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { RiftQuote, RiftQuoteRequest } from '$lib/types/rift';
import type { Token } from '$lib/types/token';
import { isNetworkEthereum, isNetworkIdBTCMainnet } from '$lib/utils/network.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Rift's canonical asset id for a token, as a `format: "raw"` quote writes it, or `undefined` for a
 * token Rift is never asked about:
 *
 * - native BTC on mainnet → `bitcoin.btc`;
 * - the native coin of an EVM network in `RIFT_EVM_NATIVE_ASSETS` → `evm:<chainId>.<name>`;
 * - an ERC-20 on such a network, an ERC-4626 vault share included → `evm:<chainId>.<contract
 *   address>`, lowercased as Rift writes it.
 */
export const toRiftAssetId = (token: Token): string | undefined => {
	const { network } = token;

	if (isNetworkIdBTCMainnet(network.id)) {
		return isBitcoinToken(token) ? RIFT_BTC_ASSET_ID : undefined;
	}

	if (!isNetworkEthereum(network)) {
		return;
	}

	const nativeAsset = RIFT_EVM_NATIVE_ASSETS[network.id];

	if (isNullish(nativeAsset)) {
		return;
	}

	const chain = `evm:${network.chainId}`;

	// An ERC-4626 vault share is an ERC-20 token too, as it is to LI.FI. Rift answers 422 for one it
	// has no route for, which is no offer.
	if (isTokenErc20(token) || isTokenErc4626(token)) {
		return `${chain}.${token.address.toLowerCase()}`;
	}

	return isDefaultEthereumToken(token) ? `${chain}.${nativeAsset}` : undefined;
};

// Rift's ids are lowercase, but an EVM address is hex, so an echo is compared without case.
export const isSameRiftAssetId = ({ a, b }: { a: string; b: string }): boolean =>
	a.toLowerCase() === b.toLowerCase();

// Native BTC on mainnet, the one Bitcoin asset Rift is asked about.
export const isRiftBtcSource = (token: Token): boolean =>
	toRiftAssetId(token) === RIFT_BTC_ASSET_ID;

/**
 * Whether a quote answers `request` and may be shown as an offer at `now`. A quote is unsigned, so
 * every field the offer rests on is checked against what OISY asked for: the raw format, the two
 * assets and the amount; a positive estimate; no integrator fee, which OISY never asks for; and an
 * expiry still ahead.
 */
export const isRiftQuoteForRequest = ({
	quote: {
		format,
		from,
		to,
		amount_in,
		estimated_amount_out,
		integrator_fee_bps,
		route,
		expires_at
	},
	request,
	now
}: {
	quote: RiftQuote;
	request: RiftQuoteRequest;
	now: number;
}): boolean => {
	const delivery = route.find((step) => step.type === 'delivery');

	return (
		format === 'raw' &&
		isSameRiftAssetId({ a: from, b: request.from }) &&
		isSameRiftAssetId({ a: to, b: request.to }) &&
		BigInt(amount_in) === BigInt(request.amount_in) &&
		BigInt(estimated_amount_out) > ZERO &&
		(integrator_fee_bps ?? 0) === 0 &&
		delivery?.type === 'delivery' &&
		BigInt(delivery.integrator_fee) === ZERO &&
		Date.parse(expires_at) > now
	);
};

// The venues of a quote's route, in the order the swap passes through them.
export const riftRouteVenues = ({ route }: RiftQuote): string[] =>
	route.flatMap((step) => (step.type === 'venue' ? [step.venue] : []));
