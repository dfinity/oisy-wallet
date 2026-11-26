import { isBtcAddress } from '$btc/utils/btc-address.utils';
import { isBitcoinToken } from '$btc/utils/token.utils';
import { RIFT_BTC_ASSET_ID, RIFT_EVM_NATIVE_ASSETS } from '$env/rest/rift.env';
import { isEthAddress } from '$eth/utils/account.utils';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { ZERO } from '$lib/constants/app.constants';
import { RiftSwapRefusedError, type RiftSwapRefusal } from '$lib/types/errors';
import type { RiftOrder, RiftQuote, RiftQuoteRequest } from '$lib/types/rift';
import type { Token } from '$lib/types/token';
import { isNetworkEthereum, isNetworkIdBTCMainnet } from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { BtcNetwork } from '@icp-sdk/canisters/ckbtc';

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
 *
 * Rift's route has exactly one delivery step, which carries the fee. A route with none or several is
 * dropped, so a fee cannot hide in a step the check does not read.
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
	const [delivery, ...otherDeliveries] = route.flatMap((step) =>
		step.type === 'delivery' ? [step] : []
	);

	return (
		format === 'raw' &&
		isSameRiftAssetId({ a: from, b: request.from }) &&
		isSameRiftAssetId({ a: to, b: request.to }) &&
		BigInt(amount_in) === BigInt(request.amount_in) &&
		BigInt(estimated_amount_out) > ZERO &&
		(integrator_fee_bps ?? 0) === 0 &&
		nonNullish(delivery) &&
		otherDeliveries.length === 0 &&
		BigInt(delivery.integrator_fee) === ZERO &&
		Date.parse(expires_at) > now
	);
};

// The venues of a quote's route, in the order the swap passes through them.
export const riftRouteVenues = ({ route }: RiftQuote): string[] =>
	route.flatMap((step) => (step.type === 'venue' ? [step.venue] : []));

const isRiftBtcAssetId = (assetId: string): boolean =>
	isSameRiftAssetId({ a: assetId, b: RIFT_BTC_ASSET_ID });

// An address on the chain of `assetId`: a Bitcoin address is compared exactly, an EVM one, which is
// hex, without case.
const isSameRiftAddress = ({
	assetId,
	a,
	b
}: {
	assetId: string;
	a: string;
	b: string;
}): boolean => (isRiftBtcAssetId(assetId) ? a === b : a.toLowerCase() === b.toLowerCase());

// A deposit address OISY can pay on the chain of `assetId`: a Bitcoin mainnet address, or an EVM one.
const isRiftDepositAddress = ({
	assetId,
	address
}: {
	assetId: string;
	address: string;
}): boolean =>
	isRiftBtcAssetId(assetId)
		? isBtcAddress({ address, network: BtcNetwork.Mainnet })
		: isEthAddress(address);

// An order that has not seen any deposit yet: the only state in which one may be sent.
export const isRiftOrderAwaitingDeposit = ({
	status,
	deposit_tx
}: Pick<RiftOrder, 'status' | 'deposit_tx'>): boolean =>
	status === 'awaiting_deposit' && isNullish(deposit_tx);

/**
 * Whether an order is the one the user reviewed, and may be paid at `now`. Rift's orders are
 * unsigned, so every field it echoes is bound to the review: the reviewed quote, its assets and
 * amount, and the user's own addresses, the payout on the destination chain and the refund on the
 * source chain. The order must still await its first deposit, before its deadline, at an address on
 * the source chain that is not one of the user's own.
 *
 * The deposit address itself is taken on Rift's word: nothing OISY can check vouches for it.
 */
export const isRiftOrderForReview = ({
	order,
	quote,
	toAddress,
	refundAddress,
	now
}: {
	order: RiftOrder;
	quote: Pick<RiftQuote, 'id' | 'from' | 'to' | 'amount_in'>;
	toAddress: string;
	refundAddress: string;
	now: number;
}): boolean => {
	const { from, to, deposit_address: depositAddress } = order;

	return (
		order.quote_id.toLowerCase() === quote.id.toLowerCase() &&
		isSameRiftAssetId({ a: from, b: quote.from }) &&
		isSameRiftAssetId({ a: to, b: quote.to }) &&
		BigInt(order.amount_in) === BigInt(quote.amount_in) &&
		isSameRiftAddress({ assetId: quote.to, a: order.to_address, b: toAddress }) &&
		nonNullish(order.refund_address) &&
		isSameRiftAddress({ assetId: quote.from, a: order.refund_address, b: refundAddress }) &&
		isRiftOrderAwaitingDeposit(order) &&
		isRiftDepositAddress({ assetId: quote.from, address: depositAddress }) &&
		!isSameRiftAddress({ assetId: quote.from, a: depositAddress, b: refundAddress }) &&
		depositAddress.toLowerCase() !== toAddress.toLowerCase() &&
		Date.parse(order.deposit_deadline) > now
	);
};

/**
 * What to tell the user of a Rift swap that stopped before its deposit, by why, or `undefined` for
 * any other failure. Nothing was sent in either case.
 */
export const riftSwapRefusedMessage = ({
	err,
	i18n
}: {
	err: unknown;
	i18n: I18n;
}): string | undefined => {
	if (!(err instanceof RiftSwapRefusedError)) {
		return;
	}

	const messages: Record<RiftSwapRefusal, string> = {
		quoteExpired: i18n.swap.error.rift_quote_expired,
		orderRefused: i18n.swap.error.rift_order_refused,
		orderUnverified: i18n.swap.error.rift_order_unverified,
		orderInFlight: i18n.swap.error.rift_order_in_flight
	};

	return messages[err.reason];
};
