import { NEAR_INTENTS_QUOTE_PUBLIC_KEY } from '$env/rest/near-intents.env';
import type {
	NearIntentsQuote,
	NearIntentsQuoteRequest,
	NearIntentsQuoteResponse
} from '$lib/types/near-intents';
import { consoleError } from '$lib/utils/console.utils';
import { nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { getBase58Decoder, getBase58Encoder } from '@solana/kit';

const ED25519_PREFIX = 'ed25519:';

// 1Click resolves some asset ids to a different id for the same coin, and both signs and
// echoes them inconsistently: a BTC origin of `nep141:btc.omft.near` used to come back as
// `1cs_v1:btc:native:coin`, and now comes back unchanged while the signature still covers
// `1cs_v1:btc:native:coin`. The legacy HOT ids of BNB Chain and Polygon tokens are signed
// as the Omni ids that replaced them (see the 1Click changelog of 2026-11-09). Each group
// lists ids that denote the same asset. Only these substitutions are accepted; every other
// asset must be echoed and signed exactly, otherwise a genuinely signed quote for a
// different token would pass and the wallet would send its source token to a deposit
// address opened for another asset.
const NEAR_INTENTS_ASSET_ALIASES: readonly (readonly string[])[] = [
	['nep141:btc.omft.near', '1cs_v1:btc:native:coin'],
	// BNB Chain: BNB, ASTER, USDT, SWEAT, USDC, NEAR, RHEA
	['nep245:v2_1.omni.hot.tg:56_11111111111111111111', 'nep141:bnb.omdep.near'],
	[
		'nep245:v2_1.omni.hot.tg:56_12zbnsg6xndDVj25QyL82YMPudb',
		'nep141:bnb-0x000ae314e2a2172a039b26378814c252734f556a.omdep.near'
	],
	[
		'nep245:v2_1.omni.hot.tg:56_2CMMyVTGZkeyNZTSvS5sarzfir6g',
		'nep141:bnb-0x55d398326f99059ff775485246999027b3197955.omdep.near'
	],
	[
		'nep245:v2_1.omni.hot.tg:56_28V9BijGeZDBFEEtkAcnJo4tPRH4',
		'nep141:bnb-0x510ad22d8c956dcc20f68932861f54a591001283.omdep.near'
	],
	[
		'nep245:v2_1.omni.hot.tg:56_2w93GqMcEmQFDru84j3HZZWt557r',
		'nep141:bnb-0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d.omdep.near'
	],
	[
		'nep245:v2_1.omni.hot.tg:56_SZzgw3HSudhZcTwPWUTi2RJB19t',
		'nep141:bnb-0x1fa4a73a3f0133f0025378af00236f3abdee5d63.omdep.near'
	],
	[
		'nep245:v2_1.omni.hot.tg:56_24S22V8GMmQN8t6PbCdRb3mBewAd',
		'nep141:bnb-0x4c067de26475e1cefee8b8d1f6e2266b33a2372e.omdep.near'
	],
	// Polygon: POL, USDC, USDT, WETH
	['nep245:v2_1.omni.hot.tg:137_11111111111111111111', 'nep141:pol.omdep.near'],
	[
		'nep245:v2_1.omni.hot.tg:137_qiStmoQJDQPTebaPjgx5VBxZv6L',
		'nep141:pol-0x3c499c542cef5e3811e1192ce70d8cc03d5c3359.omdep.near'
	],
	[
		'nep245:v2_1.omni.hot.tg:137_3hpYoaLtt8MP1Z2GH1U473DMRKgr',
		'nep141:pol-0xc2132d05d31c914a87c6611c10748aeb04b58e8f.omdep.near'
	],
	[
		'nep245:v2_1.omni.hot.tg:137_2jwTGwKRX3AEe7tyzDrxtDjEFgSt',
		'nep141:pol-0x7ceb23fd6bc0add59e62ac25578270cff1b9f619.omdep.near'
	]
];

const nearIntentsAssetAliases = (assetId: string): readonly string[] =>
	NEAR_INTENTS_ASSET_ALIASES.find((group) => group.includes(assetId)) ?? [assetId];

// Copied into an `ArrayBuffer`-backed array: the codec returns a read-only view that
// Web Crypto does not accept as a `BufferSource`.
const decodeEd25519Base58 = (value: string): Uint8Array<ArrayBuffer> => {
	const decoded = getBase58Encoder().encode(
		value.startsWith(ED25519_PREFIX) ? value.slice(ED25519_PREFIX.length) : value
	);

	const bytes = new Uint8Array(decoded.length);
	bytes.set(decoded);

	return bytes;
};

// The signed payload is a flat record of primitives, so a sorted-key serialisation that
// drops `undefined` reproduces the `json-stable-stringify` output the service signs.
const canonicalize = (payload: Record<string, unknown>): string =>
	`{${Object.keys(payload)
		.filter((key) => payload[key] !== undefined)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${JSON.stringify(payload[key])}`)
		.join(',')}}`;

// 1Click coerces falsy optionals to `undefined` before signing, so `0` and `''` are omitted
// from the payload rather than serialised. Reproducing that exactly matters: the service
// echoes `quoteWaitingTimeMs: 0` on quotes it signed without the field. Falsy rather than
// nullish on purpose, which is why `??` is not an equivalent here.
const orUndefined = <T>(value: Nullish<T>): T | undefined => {
	if (!value) {
		return;
	}

	return value;
};

const buildSignedQuoteRequest = (
	quoteRequest: NearIntentsQuoteRequest
): Record<string, unknown> => ({
	dry: quoteRequest.dry,
	swapType: quoteRequest.swapType,
	slippageTolerance: quoteRequest.slippageTolerance,
	originAsset: quoteRequest.originAsset,
	depositType: quoteRequest.depositType,
	destinationAsset: quoteRequest.destinationAsset,
	amount: quoteRequest.amount,
	refundTo: quoteRequest.refundTo,
	refundType: quoteRequest.refundType,
	recipient: quoteRequest.recipient,
	recipientType: quoteRequest.recipientType,
	deadline: quoteRequest.deadline,
	quoteWaitingTimeMs: orUndefined(quoteRequest.quoteWaitingTimeMs),
	referral: orUndefined(quoteRequest.referral),
	virtualChainRecipient: orUndefined(quoteRequest.virtualChainRecipient),
	virtualChainRefundRecipient: orUndefined(quoteRequest.virtualChainRefundRecipient),
	customRecipientMsg: orUndefined(quoteRequest.customRecipientMsg)
});

const buildSignedQuote = ({
	quote,
	dry
}: {
	quote: NearIntentsQuote;
	dry: boolean;
}): Record<string, unknown> => {
	const amounts = {
		amountIn: quote.amountIn,
		amountInFormatted: quote.amountInFormatted,
		amountInUsd: quote.amountInUsd,
		minAmountIn: quote.minAmountIn,
		amountOut: quote.amountOut,
		amountOutFormatted: quote.amountOutFormatted,
		amountOutUsd: quote.amountOutUsd,
		minAmountOut: quote.minAmountOut
	};

	// A dry quote reserves no deposit address, so the service signs the amounts alone.
	if (dry) {
		return amounts;
	}

	return {
		...amounts,
		depositAddress: orUndefined(quote.depositAddress),
		depositMemo: orUndefined(quote.depositMemo),
		deadline: orUndefined(quote.deadline),
		timeWhenInactive: orUndefined(quote.timeWhenInactive),
		timeEstimate: orUndefined(quote.timeEstimate),
		virtualChainRecipient: orUndefined(quote.virtualChainRecipient),
		virtualChainRefundRecipient: orUndefined(quote.virtualChainRefundRecipient),
		customRecipientMsg: orUndefined(quote.customRecipientMsg),
		refundFee: orUndefined(quote.refundFee),
		withdrawFee: orUndefined(quote.withdrawFee)
	};
};

/**
 * Recomputes the base58 SHA-256 digest that 1Click signs for a quote response.
 *
 * The quote's own `deadline` deliberately overwrites the request's: the service spreads
 * the quote over the request before hashing, so only one `deadline` reaches the digest.
 */
export const nearIntentsQuoteHash = async (response: NearIntentsQuoteResponse): Promise<string> => {
	const dataString = canonicalize({
		...buildSignedQuoteRequest(response.quoteRequest),
		...buildSignedQuote({ quote: response.quote, dry: response.quoteRequest.dry }),
		timestamp: response.timestamp
	});

	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataString));

	return getBase58Decoder().decode(new Uint8Array(digest));
};

// The service signs the asset ids it resolved the request to, which for an aliased asset
// need not be the ids it echoes, so every alias combination is a candidate. Each candidate
// names the same assets, so this widens nothing: a quote for any other asset still fails.
const signedQuoteRequestCandidates = (
	quoteRequest: NearIntentsQuoteRequest
): NearIntentsQuoteRequest[] =>
	nearIntentsAssetAliases(quoteRequest.originAsset).flatMap((originAsset) =>
		nearIntentsAssetAliases(quoteRequest.destinationAsset).map((destinationAsset) => ({
			...quoteRequest,
			originAsset,
			destinationAsset
		}))
	);

/**
 * Verifies that a quote response was issued by the 1Click service.
 *
 * The signature covers the deposit address, both amounts, both assets and the
 * recipient/refund addresses, so a response tampered with in transit no longer
 * authenticates. Any failure (missing signature, malformed base58, a runtime without
 * Ed25519) resolves to `false`: an unverifiable quote must never move funds.
 */
export const verifyNearIntentsQuoteSignature = async (
	response: NearIntentsQuoteResponse
): Promise<boolean> => {
	try {
		const publicKey = await crypto.subtle.importKey(
			'raw',
			decodeEd25519Base58(NEAR_INTENTS_QUOTE_PUBLIC_KEY),
			{ name: 'Ed25519' },
			false,
			['verify']
		);

		const signature = decodeEd25519Base58(response.signature);

		const results = await Promise.all(
			signedQuoteRequestCandidates(response.quoteRequest).map(async (quoteRequest) => {
				const hash = await nearIntentsQuoteHash({ ...response, quoteRequest });

				return await crypto.subtle.verify(
					'Ed25519',
					publicKey,
					signature,
					new TextEncoder().encode(hash)
				);
			})
		);

		return results.some((verified) => verified);
	} catch (err: unknown) {
		consoleError(err);

		return false;
	}
};

/**
 * Whether the quote is past the window the service signed for it.
 *
 * A signature carries no freshness, so a captured quote stays cryptographically valid
 * forever and its stale deposit address would still pass verification. Both bounds are
 * part of the signed payload, so the tighter of the two is authoritative. A quote with no
 * parseable bound counts as expired: an unbounded deposit address must not execute.
 */
export const isNearIntentsQuoteExpired = ({
	quote: { deadline, timeWhenInactive }
}: NearIntentsQuoteResponse): boolean => {
	const bounds = [deadline, timeWhenInactive].filter(nonNullish).map((bound) => Date.parse(bound));

	if (bounds.length === 0 || bounds.some((bound) => Number.isNaN(bound))) {
		return true;
	}

	return Math.min(...bounds) <= Date.now();
};

// A valid signature only proves 1Click issued the quote, not that it issued it to us: an
// attacker can request a genuine quote paying out to their own address and substitute the
// whole signed response. Comparing the echoed request against what we sent closes that gap.
const SIGNED_REQUEST_MATCHED_FIELDS = [
	'amount',
	'recipient',
	'recipientType',
	'refundTo',
	'refundType',
	'depositType',
	'swapType',
	'slippageTolerance',
	'dry'
] as const satisfies readonly (keyof NearIntentsQuoteRequest)[];

const ASSET_FIELDS = [
	'originAsset',
	'destinationAsset'
] as const satisfies readonly (keyof NearIntentsQuoteRequest)[];

const isSameNearIntentsAsset = ({ sent, echoed }: { sent: string; echoed: string }): boolean =>
	nearIntentsAssetAliases(sent).includes(echoed);

/**
 * Returns the name of the first field the service echoed back differently from what was
 * requested, or `undefined` when the echoed request matches.
 */
export const findNearIntentsQuoteRequestMismatch = ({
	sent,
	echoed
}: {
	sent: NearIntentsQuoteRequest;
	echoed: NearIntentsQuoteRequest;
}): string | undefined => {
	const mismatch = SIGNED_REQUEST_MATCHED_FIELDS.find((key) => sent[key] !== echoed[key]);

	if (nonNullish(mismatch)) {
		return mismatch;
	}

	return ASSET_FIELDS.find(
		(key) => !isSameNearIntentsAsset({ sent: sent[key], echoed: echoed[key] })
	);
};
