import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { ZERO } from '$lib/constants/app.constants';
import { parseNetworkId } from '$lib/validation/network.validation';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockRlusdIssuer, mockXrpAddress, mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import { XRP_MAX_FEE_DROPS } from '$xrp/constants/xrp.constants';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import * as xrpInFlightServices from '$xrp/services/xrp-in-flight.services';
import { loadXrpRemoveTokenReview } from '$xrp/services/xrp-remove-token.services';
import { XrpNetworks } from '$xrp/types/network';
import { XrpSendAlreadyInFlightError, XrpSendNotGuardedError } from '$xrp/types/xrp-send';
import type { XrpAccountInfo } from '$xrp/types/xrp-transaction';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';

vi.mock('$xrp/services/xrp-in-flight.services', () => ({
	assertNoXrpPaymentInFlight: vi.fn()
}));

vi.mock(import('$xrp/rest/xrpl.rest'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		loadXrpAccountInfo: vi.fn(),
		loadXrpAccountLines: vi.fn(),
		loadXrpOpenLedgerFee: vi.fn()
	};
});

describe('xrp-remove-token.services', () => {
	const token = { ...RLUSD_TOKEN, enabled: true };

	const accountInfo: XrpAccountInfo = {
		balance: 20_000_000n,
		sequence: 7,
		ownerCount: 1,
		flags: 0
	};

	const heldAtZero: XrpTrustLine = { ...mockXrpTrustLine, balance: '0' };

	const mockReads = ({
		lines = [heldAtZero],
		account = accountInfo,
		fee = 12n
	}: {
		lines?: XrpTrustLine[] | Error;
		account?: XrpAccountInfo | Error;
		fee?: bigint | Error;
	} = {}) => {
		vi.mocked(xrplRest.loadXrpAccountLines).mockImplementation(() =>
			lines instanceof Error ? Promise.reject(lines) : Promise.resolve(lines)
		);
		vi.mocked(xrplRest.loadXrpAccountInfo).mockImplementation(() =>
			account instanceof Error ? Promise.reject(account) : Promise.resolve(account)
		);
		vi.mocked(xrplRest.loadXrpOpenLedgerFee).mockImplementation(() =>
			fee instanceof Error ? Promise.reject(fee) : Promise.resolve(fee)
		);
	};

	const params = { identity: mockIdentity, token, address: mockXrpAddress };

	beforeEach(() => {
		vi.clearAllMocks();
		mockReads();
		vi.mocked(xrpInFlightServices.assertNoXrpPaymentInFlight).mockResolvedValue(mockIdentity);
	});

	it('reviews the removal with its fee', async () => {
		await expect(loadXrpRemoveTokenReview(params)).resolves.toEqual({ review: { fee: 12n } });
	});

	it('reads the line with the issuer as peer, the account at the validated ledger, and the guard', async () => {
		await loadXrpRemoveTokenReview(params);

		expect(xrplRest.loadXrpAccountLines).toHaveBeenCalledExactlyOnceWith({
			address: mockXrpAddress,
			network: XrpNetworks.mainnet,
			peer: mockRlusdIssuer
		});
		expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledExactlyOnceWith({
			address: mockXrpAddress,
			network: XrpNetworks.mainnet,
			ledgerIndex: 'validated'
		});
		expect(xrpInFlightServices.assertNoXrpPaymentInFlight).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			source: mockXrpAddress
		});
	});

	it.each([
		['no address', { address: undefined }],
		[
			'a network without an XRP Ledger to ask',
			{
				token: {
					...token,
					network: { ...XRP_MAINNET_NETWORK, id: parseNetworkId('ETH') }
				}
			}
		]
	])('refuses with %s, reading nothing', async (...[, override]) => {
		await expect(loadXrpRemoveTokenReview({ ...params, ...override })).resolves.toEqual({
			refusal: 'state_unavailable'
		});

		expect(xrplRest.loadXrpAccountLines).not.toHaveBeenCalled();
	});

	// The ledger would fail the `TrustSet` as redundant and keep the fee.
	it.each([
		['no line', []],
		['only a line of another token', [{ ...heldAtZero, currency: 'USD' }]]
	])('refuses when the account holds %s', async (...[, lines]) => {
		mockReads({ lines });

		await expect(loadXrpRemoveTokenReview(params)).resolves.toEqual({ refusal: 'not_held' });
	});

	// The ledger would keep the line, and with a zero limit the account could no longer receive.
	it.each(['12.5', '1e-20'])('refuses a balance of %s', async (balance) => {
		mockReads({ lines: [{ ...heldAtZero, balance }] });

		await expect(loadXrpRemoveTokenReview(params)).resolves.toEqual({
			refusal: 'balance_not_zero'
		});
	});

	it.each([
		['the line', { lines: new Error('down') }],
		['the account', { account: new Error('down') }],
		['the fee', { fee: new Error('down') }]
	])('refuses when %s cannot be read', async (...[, reads]) => {
		mockReads(reads);

		await expect(loadXrpRemoveTokenReview(params)).resolves.toEqual({
			refusal: 'state_unavailable'
		});
	});

	it.each([ZERO, XRP_MAX_FEE_DROPS + 1n])(
		'refuses a fee quote of %s drops it would not sign',
		async (fee) => {
			mockReads({ fee });

			await expect(loadXrpRemoveTokenReview(params)).resolves.toEqual({
				refusal: 'state_unavailable'
			});
		}
	);

	it('refuses a balance that cannot pay the fee', async () => {
		mockReads({ account: { ...accountInfo, balance: 11n } });

		await expect(loadXrpRemoveTokenReview(params)).resolves.toEqual({
			refusal: 'insufficient_fee'
		});
	});

	// Removing releases a reserve rather than adding one.
	it('needs only the fee, whatever the account owns', async () => {
		mockReads({ account: { ...accountInfo, balance: 12n, ownerCount: 5 } });

		await expect(loadXrpRemoveTokenReview(params)).resolves.toEqual({ review: { fee: 12n } });
	});

	it.each([
		[
			'an unresolved transaction from the address',
			new XrpSendAlreadyInFlightError('open'),
			'transaction_in_flight'
		],
		['a guard that could not be asked', new XrpSendNotGuardedError('down'), 'not_guarded']
	])('refuses with %s', async (...[, err, refusal]) => {
		vi.mocked(xrpInFlightServices.assertNoXrpPaymentInFlight).mockRejectedValue(err);

		await expect(loadXrpRemoveTokenReview(params)).resolves.toEqual({ refusal });
	});
});
