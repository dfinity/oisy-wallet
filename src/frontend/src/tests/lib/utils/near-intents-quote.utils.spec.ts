import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import {
	findNearIntentsQuoteRequestMismatch,
	nearIntentsQuoteHash,
	verifyNearIntentsQuoteSignature
} from '$lib/utils/near-intents-quote.utils';

// A real, unmodified `POST /v0/quote` response captured from 1Click. It anchors the
// canonicalisation to what the service actually signs: any drift in field selection,
// key ordering or falsy-value handling breaks the signature check below.
const mockSignedQuoteResponse: NearIntentsQuoteResponse = {
	quote: {
		amountIn: '10000000',
		amountInFormatted: '10.0',
		amountInUsd: '9.999200000000',
		minAmountIn: '10000000',
		amountOut: '9986764',
		amountOutFormatted: '9.986764',
		amountOutUsd: '9.985965058880',
		minAmountOut: '9886896',
		timeEstimate: 27,
		refundFee: '5300',
		withdrawFee: '2400',
		deadline: '2026-08-30T07:21:43.997Z',
		timeWhenInactive: '2026-08-30T07:21:43.997Z',
		depositAddress: '0xE7fDD0A40C1fD2214c5df75A0CF6f03891489834',
		depositMemo: null
	},
	quoteRequest: {
		dry: false,
		swapType: 'EXACT_INPUT',
		slippageTolerance: 100,
		originAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
		depositType: 'ORIGIN_CHAIN',
		destinationAsset: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
		amount: '10000000',
		refundTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
		refundType: 'ORIGIN_CHAIN',
		recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
		recipientType: 'DESTINATION_CHAIN',
		deadline: '2026-08-27T07:21:43.997Z',
		// Echoed as `0` on a quote the service signed without the field. The hash only
		// matches because falsy optionals are dropped rather than serialised.
		quoteWaitingTimeMs: 0
	},
	signature:
		'ed25519:41SSU61qeMdkRzUyzenvev239aziPQT86qBwG6u2xzr1rSbaG7oRZjVAYsK8MrUAtVnwUpCqmhfRFmnoeRsH816E',
	timestamp: '2026-08-27T07:11:44.188Z',
	correlationId: '18778575-3129-43fa-89c1-18dfdf9c75af'
};

describe('near-intents-quote.utils', () => {
	describe('nearIntentsQuoteHash', () => {
		it('reproduces the digest the service signed', async () => {
			await expect(nearIntentsQuoteHash(mockSignedQuoteResponse)).resolves.toBe(
				'6XFsdVBQKwZU8HresppceHwnRbi9rByi8h1XHtbB9stQ'
			);
		});
	});

	describe('verifyNearIntentsQuoteSignature', () => {
		it('accepts a genuine quote', async () => {
			await expect(verifyNearIntentsQuoteSignature(mockSignedQuoteResponse)).resolves.toBeTruthy();
		});

		it('rejects a redirected deposit address', async () => {
			await expect(
				verifyNearIntentsQuoteSignature({
					...mockSignedQuoteResponse,
					quote: {
						...mockSignedQuoteResponse.quote,
						depositAddress: '0x0000000000000000000000000000000000000bad'
					}
				})
			).resolves.toBeFalsy();
		});

		it.each([
			{ field: 'recipient', override: { recipient: '0x0000000000000000000000000000000000000bad' } },
			{ field: 'refundTo', override: { refundTo: '0x0000000000000000000000000000000000000bad' } },
			{ field: 'amount', override: { amount: '99999999' } }
		])('rejects a tampered $field', async ({ override }) => {
			await expect(
				verifyNearIntentsQuoteSignature({
					...mockSignedQuoteResponse,
					quoteRequest: { ...mockSignedQuoteResponse.quoteRequest, ...override }
				})
			).resolves.toBeFalsy();
		});

		it('rejects a tampered amountOut', async () => {
			await expect(
				verifyNearIntentsQuoteSignature({
					...mockSignedQuoteResponse,
					quote: { ...mockSignedQuoteResponse.quote, amountOut: '1' }
				})
			).resolves.toBeFalsy();
		});

		it.each([
			{ label: 'an absent signature', signature: '' },
			{ label: 'a malformed signature', signature: 'ed25519:not-base58-0OIl' },
			{ label: 'a well-formed signature from another key', signature: `ed25519:${'1'.repeat(88)}` }
		])('rejects $label', async ({ signature }) => {
			await expect(
				verifyNearIntentsQuoteSignature({ ...mockSignedQuoteResponse, signature })
			).resolves.toBeFalsy();
		});
	});

	describe('findNearIntentsQuoteRequestMismatch', () => {
		const sent = mockSignedQuoteResponse.quoteRequest;

		it('passes when the service echoes the request', () => {
			expect(findNearIntentsQuoteRequestMismatch({ sent, echoed: { ...sent } })).toBeUndefined();
		});

		it('ignores the extra fields the service adds to the echo', () => {
			expect(
				findNearIntentsQuoteRequestMismatch({
					sent,
					echoed: { ...sent, referral: 'oisy', quoteWaitingTimeMs: 3000 }
				})
			).toBeUndefined();
		});

		// 1Click re-routes a BTC origin to its own asset id, so the identifier is
		// deliberately not compared: pinning it would reject every BTC swap.
		it('tolerates a re-routed origin asset', () => {
			expect(
				findNearIntentsQuoteRequestMismatch({
					sent: { ...sent, originAsset: 'nep141:btc.omft.near' },
					echoed: { ...sent, originAsset: '1cs_v1:btc:native:coin' }
				})
			).toBeUndefined();
		});

		it.each([
			{ field: 'recipient', value: '0x0000000000000000000000000000000000000bad' },
			{ field: 'refundTo', value: '0x0000000000000000000000000000000000000bad' },
			{ field: 'amount', value: '99999999' }
		])('catches a substituted $field', ({ field, value }) => {
			expect(
				findNearIntentsQuoteRequestMismatch({ sent, echoed: { ...sent, [field]: value } })
			).toBe(field);
		});
	});
});
