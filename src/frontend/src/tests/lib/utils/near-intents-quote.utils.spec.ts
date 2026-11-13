import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import {
	findNearIntentsQuoteRequestMismatch,
	isNearIntentsQuoteExpired,
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

// Real `POST /v0/quote` responses captured on 2026-11-13, for assets 1Click signs under a
// different id than the one it echoes. Trimmed to the fields `NearIntentsQuoteResponse`
// models: the echoed `appFees`, `confidentiality`, `depositMode` and `insured` are not part
// of the signed payload, and the absent `depositMemo` is typed as `null`, which hashes the
// same because falsy values are dropped.

// Echoes `nep141:btc.omft.near` but is signed as `1cs_v1:btc:native:coin`.
const mockBtcOriginSignedQuoteResponse: NearIntentsQuoteResponse = {
	quote: {
		amountIn: '1000000',
		amountInFormatted: '0.01',
		amountInUsd: '687.850000000000',
		minAmountIn: '1000000',
		amountOut: '354489536447305163',
		amountOutFormatted: '0.354489536447305163',
		amountOutUsd: '686.224389550058',
		minAmountOut: '350944641082832111',
		timeEstimate: 812,
		refundFee: '1900',
		withdrawFee: '35000000000000',
		deadline: '2026-11-16T10:18:53.821Z',
		timeWhenInactive: '2026-11-16T10:18:53.821Z',
		depositAddress: 'bc1qgu9qdg45v2vekm0kzj34zj5krat85gqu0lgg63',
		depositMemo: null
	},
	quoteRequest: {
		dry: false,
		swapType: 'EXACT_INPUT',
		slippageTolerance: 100,
		originAsset: 'nep141:btc.omft.near',
		depositType: 'ORIGIN_CHAIN',
		destinationAsset: 'nep141:eth.omft.near',
		amount: '1000000',
		refundTo: 'bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g',
		refundType: 'ORIGIN_CHAIN',
		recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
		recipientType: 'DESTINATION_CHAIN',
		deadline: '2026-11-13T10:18:53.821Z',
		quoteWaitingTimeMs: 0
	},
	signature:
		'ed25519:5MhF4ts1SaJhhUuFdXNdCTbEpGWYSQ2AAnhGHTTFSwa9pUV8onWQaxRVC1uv9Pm34jxBQqDdebTR5DsEuN84RSJT',
	timestamp: '2026-11-13T09:18:53.937Z',
	correlationId: '48491742-6230-48b6-82f2-07e8d45e0ef3'
};

// Echoes the legacy HOT id of BNB Chain USDC but is signed as its Omni id.
const mockBscUsdcDestinationSignedQuoteResponse: NearIntentsQuoteResponse = {
	quote: {
		amountIn: '25000000',
		amountInFormatted: '25.0',
		amountInUsd: '24.987850000000',
		minAmountIn: '25000000',
		amountOut: '24985167145117869690',
		amountOutFormatted: '24.98516714511786969',
		amountOutUsd: '24.973024353885',
		minAmountOut: '24735315473666690993',
		timeEstimate: 38,
		refundFee: '2400',
		withdrawFee: '10033366248201662',
		deadline: '2026-11-16T09:28:21.840Z',
		timeWhenInactive: '2026-11-16T09:28:21.840Z',
		depositAddress: '0x580bA8b52f69d8B1E8Fa23ce6a4a9dFa759186BD',
		depositMemo: null
	},
	quoteRequest: {
		dry: false,
		swapType: 'EXACT_INPUT',
		slippageTolerance: 100,
		originAsset: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
		depositType: 'ORIGIN_CHAIN',
		destinationAsset: 'nep245:v2_1.omni.hot.tg:56_2w93GqMcEmQFDru84j3HZZWt557r',
		amount: '25000000',
		refundTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
		refundType: 'ORIGIN_CHAIN',
		recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
		recipientType: 'DESTINATION_CHAIN',
		deadline: '2026-11-13T09:28:21.840Z',
		quoteWaitingTimeMs: 0
	},
	signature:
		'ed25519:rxDzQPPb8K9GhhDjzSHh2TrpgGwzPj1ressrdUhYsMSic5VEULBHDfGfw5scmhqP7paVipf3GnfjAPPWmgcZMvf',
	timestamp: '2026-11-13T09:25:22.871Z',
	correlationId: '07a1c8e8-b788-43e2-8c36-36289a1b93e4'
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

		it.each([
			{ label: 'a BTC origin', response: mockBtcOriginSignedQuoteResponse },
			{
				label: 'a legacy BNB Chain destination',
				response: mockBscUsdcDestinationSignedQuoteResponse
			}
		])('accepts a genuine quote signed under an alias of $label', async ({ response }) => {
			await expect(verifyNearIntentsQuoteSignature(response)).resolves.toBeTruthy();
		});

		// Earlier, 1Click echoed the id it signed; the check must hold whichever alias comes back.
		it('accepts the quote when the service echoes the signed alias', async () => {
			await expect(
				verifyNearIntentsQuoteSignature({
					...mockBtcOriginSignedQuoteResponse,
					quoteRequest: {
						...mockBtcOriginSignedQuoteResponse.quoteRequest,
						originAsset: '1cs_v1:btc:native:coin'
					}
				})
			).resolves.toBeTruthy();
		});

		it('rejects a quote signed under an alias once its deposit address is redirected', async () => {
			await expect(
				verifyNearIntentsQuoteSignature({
					...mockBtcOriginSignedQuoteResponse,
					quote: {
						...mockBtcOriginSignedQuoteResponse.quote,
						depositAddress: 'bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g'
					}
				})
			).resolves.toBeFalsy();
		});

		it.each([
			{ field: 'originAsset', override: { originAsset: 'nep141:eth.omft.near' } },
			{
				field: 'destinationAsset',
				override: {
					destinationAsset: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near'
				}
			}
		])(
			'rejects a quote signed under an alias once $field names another asset',
			async ({ override }) => {
				await expect(
					verifyNearIntentsQuoteSignature({
						...mockBtcOriginSignedQuoteResponse,
						quoteRequest: { ...mockBtcOriginSignedQuoteResponse.quoteRequest, ...override }
					})
				).resolves.toBeFalsy();
			}
		);

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

	describe('isNearIntentsQuoteExpired', () => {
		// The captured quote carries fixed bounds, so the clock is pinned rather than the
		// fixture: otherwise these assertions would flip once the real date passes them.
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('accepts a quote inside the window it was signed for', () => {
			vi.setSystemTime(new Date('2026-08-28T00:00:00.000Z'));

			expect(isNearIntentsQuoteExpired(mockSignedQuoteResponse)).toBeFalsy();
		});

		it('rejects a captured quote once the window has lapsed', () => {
			vi.setSystemTime(new Date('2026-08-31T00:00:00.000Z'));

			expect(isNearIntentsQuoteExpired(mockSignedQuoteResponse)).toBeTruthy();
		});

		// Both bounds are signed, so the tighter one governs.
		it('honours the earlier of the two signed bounds', () => {
			vi.setSystemTime(new Date('2026-08-28T00:00:00.000Z'));

			expect(
				isNearIntentsQuoteExpired({
					...mockSignedQuoteResponse,
					quote: {
						...mockSignedQuoteResponse.quote,
						timeWhenInactive: '2026-08-27T00:00:00.000Z'
					}
				})
			).toBeTruthy();
		});

		it('rejects a quote with no parseable bound', () => {
			vi.setSystemTime(new Date('2026-08-28T00:00:00.000Z'));

			expect(
				isNearIntentsQuoteExpired({
					...mockSignedQuoteResponse,
					quote: { ...mockSignedQuoteResponse.quote, deadline: 'not-a-date' }
				})
			).toBeTruthy();
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

		it.each([
			{ label: 'BTC', from: 'nep141:btc.omft.near', to: '1cs_v1:btc:native:coin' },
			{
				label: 'BNB Chain USDC',
				from: 'nep245:v2_1.omni.hot.tg:56_2w93GqMcEmQFDru84j3HZZWt557r',
				to: 'nep141:bnb-0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d.omdep.near'
			}
		])('tolerates the known $label asset alias', ({ from, to }) => {
			expect(
				findNearIntentsQuoteRequestMismatch({
					sent: { ...sent, originAsset: from },
					echoed: { ...sent, originAsset: to }
				})
			).toBeUndefined();
		});

		// Otherwise a genuinely signed quote for a different token would pass, and the wallet
		// would send its source token to a deposit address opened for another asset.
		it.each([
			{ field: 'originAsset', value: 'nep141:arb-0xdeadbeef.omft.near' },
			{ field: 'destinationAsset', value: 'nep141:sol-0xdeadbeef.omft.near' }
		])('catches a substituted $field', ({ field, value }) => {
			expect(
				findNearIntentsQuoteRequestMismatch({ sent, echoed: { ...sent, [field]: value } })
			).toBe(field);
		});

		it('catches an asset swapped for an unrelated one on the same chain', () => {
			expect(
				findNearIntentsQuoteRequestMismatch({
					sent: { ...sent, originAsset: 'nep141:btc.omft.near' },
					echoed: { ...sent, originAsset: 'nep141:eth.omft.near' }
				})
			).toBe('originAsset');
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
