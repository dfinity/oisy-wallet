import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	mockRlusdCurrencyCode,
	mockRlusdIssuer,
	mockXrpAddress,
	mockXrpAddress2,
	mockXrpTrustLine
} from '$tests/mocks/xrp.mock';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { XrpAccountNotFoundError } from '$xrp/rest/xrpl.rest';
import { loadXrpAddTokenReview } from '$xrp/services/xrp-add-token.services';
import type { XrpAccountInfo } from '$xrp/types/xrp-transaction';

vi.mock(import('$xrp/rest/xrpl.rest'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		loadXrpAccountInfo: vi.fn(),
		loadXrpOpenLedgerFee: vi.fn()
	};
});

describe('xrp-add-token.services', () => {
	// RLUSD's issuer as measured: can freeze, can claw back, holders can send to each other.
	const RLUSD_ISSUER_FLAGS = 0x819a0000;
	const DISALLOW_INCOMING_TRUST_LINE = 0x20000000;

	const issuerInfo: XrpAccountInfo = {
		balance: 50_000_000n,
		sequence: 1,
		ownerCount: 0,
		flags: RLUSD_ISSUER_FLAGS
	};

	const accountInfo: XrpAccountInfo = {
		balance: 20_000_000n,
		sequence: 7,
		ownerCount: 0,
		flags: 0
	};

	const mockReads = ({
		issuer = issuerInfo,
		account = accountInfo,
		fee = 12n
	}: {
		issuer?: XrpAccountInfo | Error;
		account?: XrpAccountInfo | Error;
		fee?: bigint | Error;
	} = {}) => {
		vi.mocked(xrplRest.loadXrpAccountInfo).mockImplementation(({ address }) => {
			const info = address === mockXrpAddress ? account : issuer;
			return info instanceof Error ? Promise.reject(info) : Promise.resolve(info);
		});
		vi.mocked(xrplRest.loadXrpOpenLedgerFee).mockImplementation(() =>
			fee instanceof Error ? Promise.reject(fee) : Promise.resolve(fee)
		);
	};

	const params = {
		currency: 'RLUSD',
		issuer: mockRlusdIssuer,
		address: mockXrpAddress,
		lines: [],
		network: XRP_MAINNET_NETWORK
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockReads();
	});

	it('reviews RLUSD with exactly its two issuer powers, its fee and the reserve after adding', async () => {
		const { review, refusal } = await loadXrpAddTokenReview(params);

		expect(refusal).toBeUndefined();
		expect(review).toEqual({
			token: { ...RLUSD_TOKEN, enabled: true },
			powers: [{ type: 'freeze' }, { type: 'clawback' }],
			fee: 12n,
			reserveAfter: 1_200_000n
		});
	});

	it.each([
		{ name: 'the 40-hex code', currency: mockRlusdCurrencyCode },
		{ name: 'the lowercase 40-hex code', currency: mockRlusdCurrencyCode.toLowerCase() }
	])('resolves $name to the same token', async ({ currency }) => {
		const { review } = await loadXrpAddTokenReview({ ...params, currency });

		expect(review?.token.id).toBe(RLUSD_TOKEN.id);
	});

	it('warns when the code is a listed token’s under another issuer, without refusing it', async () => {
		const { review } = await loadXrpAddTokenReview({ ...params, issuer: mockXrpAddress2 });

		expect(review?.lookalike).toEqual(RLUSD_TOKEN);
		expect(review?.token.id).not.toBe(RLUSD_TOKEN.id);
	});

	it('states the reserve after adding when the ledger waives it at creation', async () => {
		mockReads({ account: { ...accountInfo, balance: 1_000_020n, ownerCount: 1 } });

		const { review } = await loadXrpAddTokenReview(params);

		expect(review?.reserveAfter).toBe(1_400_000n);
	});

	it.each([
		{
			name: 'an invalid currency code',
			override: { currency: 'XRP' },
			refusal: 'invalid_currency_code'
		},
		{
			name: 'an X-address as the issuer',
			override: { issuer: 'XVPcpSm47b1CZkf5AkKM9a84dQHe3m4sBhsrA4XtnBECTAc' },
			refusal: 'invalid_issuer'
		},
		{
			name: 'the user’s own address as the issuer',
			override: { issuer: mockXrpAddress },
			refusal: 'issuer_is_own_address'
		},
		{
			name: 'a token already held',
			override: { lines: [mockXrpTrustLine] },
			refusal: 'already_added'
		},
		{ name: 'lines not read yet', override: { lines: undefined }, refusal: 'state_unavailable' },
		{ name: 'no address yet', override: { address: undefined }, refusal: 'state_unavailable' },
		{
			name: 'a network other than the XRP Ledger',
			override: { network: ETHEREUM_NETWORK },
			refusal: 'state_unavailable'
		}
	])('refuses $name before reading the ledger', async ({ override, refusal }) => {
		const result = await loadXrpAddTokenReview({ ...params, ...override });

		expect(result).toEqual({ refusal });
		expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
	});

	it.each([
		{
			name: 'an issuer without an account',
			reads: { issuer: new XrpAccountNotFoundError('absent') },
			refusal: 'issuer_not_found'
		},
		{
			name: 'an issuer that refuses new trust lines',
			reads: {
				issuer: { ...issuerInfo, flags: RLUSD_ISSUER_FLAGS | DISALLOW_INCOMING_TRUST_LINE }
			},
			refusal: 'issuer_disallows_trust_lines'
		},
		{
			name: 'an account that is not on the ledger yet',
			reads: { account: new XrpAccountNotFoundError('absent') },
			refusal: 'account_not_found'
		},
		{
			name: 'a balance below the fee',
			reads: { account: { ...accountInfo, balance: 11n } },
			refusal: 'insufficient_fee'
		},
		{
			name: 'an issuer that cannot be read',
			reads: { issuer: new Error('timeout') },
			refusal: 'state_unavailable'
		},
		{
			name: 'an account that cannot be read',
			reads: { account: new Error('timeout') },
			refusal: 'state_unavailable'
		},
		{ name: 'no fee quote', reads: { fee: new Error('tooBusy') }, refusal: 'state_unavailable' },
		{ name: 'a fee quote of zero', reads: { fee: ZERO }, refusal: 'state_unavailable' },
		{ name: 'a fee quote above the maximum', reads: { fee: 10_001n }, refusal: 'state_unavailable' }
	])('refuses $name', async ({ reads, refusal }) => {
		mockReads(reads);

		await expect(loadXrpAddTokenReview(params)).resolves.toEqual({ refusal });
	});

	it('refuses, with the reserve, a balance below the raised reserve once two objects are owned', async () => {
		mockReads({ account: { ...accountInfo, balance: 1_500_000n, ownerCount: 2 } });

		await expect(loadXrpAddTokenReview(params)).resolves.toEqual({
			refusal: 'insufficient_reserve',
			reserve: 1_600_000n
		});
	});

	it('does not refuse a low balance while the ledger waives the reserve at creation', async () => {
		mockReads({ account: { ...accountInfo, balance: 1_000_020n, ownerCount: 1 } });

		expect((await loadXrpAddTokenReview(params)).refusal).toBeUndefined();
	});

	it('reads both accounts on the validated ledger', async () => {
		await loadXrpAddTokenReview(params);

		expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
			address: mockRlusdIssuer,
			network: 'mainnet',
			ledgerIndex: 'validated'
		});
		expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
			address: mockXrpAddress,
			network: 'mainnet',
			ledgerIndex: 'validated'
		});
	});
});
