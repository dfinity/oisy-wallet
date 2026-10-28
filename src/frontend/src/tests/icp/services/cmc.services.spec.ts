import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import * as icpIndexApi from '$icp/api/icp-index.api';
import {
	CMC_DEPOSIT_LOOKUP_PAGE_SIZE,
	CMC_MINT_CYCLES_MEMO,
	ICP_LEDGER_PERMITTED_DRIFT_NS
} from '$icp/constants/cmc.constants';
import { findCmcDeposit } from '$icp/services/cmc.services';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

const DEPOSIT_ACCOUNT_IDENTIFIER = 'a1b2c3';
const OWN_ACCOUNT_IDENTIFIER = getAccountIdentifier(mockPrincipal).toHex();
const AMOUNT = 100_000_000n;
const CREATED_AT_NS = 1_790_000_000_000_000_000n;

// Another deposit memo than the one the tests look for, so that only the memo tells the two
// entries apart.
const OTHER_MEMO = new Uint8Array([0x54, 0x50, 0x55, 0x50, 0, 0, 0, 0]);

const entry = ({
	id,
	memo,
	timestampNs = CREATED_AT_NS + 1n
}: {
	id: bigint;
	memo: Uint8Array;
	timestampNs?: bigint;
}): IcpIndexDid.TransactionWithId => ({
	id,
	transaction: {
		memo: ZERO,
		icrc1_memo: [memo],
		operation: {
			Transfer: {
				to: DEPOSIT_ACCOUNT_IDENTIFIER,
				fee: { e8s: 10_000n },
				from: OWN_ACCOUNT_IDENTIFIER,
				amount: { e8s: AMOUNT },
				spender: []
			}
		},
		timestamp: [{ timestamp_nanos: timestampNs }],
		created_at_time: [{ timestamp_nanos: CREATED_AT_NS }]
	}
});

describe('cmc.services', () => {
	describe('findCmcDeposit', () => {
		let lookupSpy: ReturnType<typeof vi.spyOn>;

		const find = () =>
			findCmcDeposit({
				identity: mockIdentity,
				depositAccountIdentifier: DEPOSIT_ACCOUNT_IDENTIFIER,
				memo: CMC_MINT_CYCLES_MEMO,
				amount: AMOUNT,
				transferCreatedAtNs: CREATED_AT_NS
			});

		beforeEach(() => {
			vi.restoreAllMocks();

			lookupSpy = vi.spyOn(icpIndexApi, 'getAccountIdentifierTransactions');
		});

		it('reads the certified history of the deposit account it is given', async () => {
			lookupSpy.mockResolvedValue({ balance: ZERO, transactions: [], oldest_tx_id: [] });

			await find();

			expect(lookupSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				accountIdentifier: DEPOSIT_ACCOUNT_IDENTIFIER,
				start: undefined,
				maxResults: CMC_DEPOSIT_LOOKUP_PAGE_SIZE,
				indexCanisterId: ICP_INDEX_CANISTER_ID,
				certified: true
			});
		});

		it('finds the transfer with the memo it is given, and no other', async () => {
			lookupSpy.mockResolvedValue({
				balance: ZERO,
				transactions: [
					entry({ id: 21n, memo: OTHER_MEMO }),
					entry({ id: 20n, memo: CMC_MINT_CYCLES_MEMO })
				],
				oldest_tx_id: []
			});

			await expect(find()).resolves.toBe(20n);
		});

		it('finds nothing once the history is older than the deposit could be', async () => {
			lookupSpy.mockResolvedValue({
				balance: ZERO,
				transactions: [
					entry({
						id: 21n,
						memo: OTHER_MEMO,
						timestampNs: CREATED_AT_NS - ICP_LEDGER_PERMITTED_DRIFT_NS - 1n
					})
				],
				oldest_tx_id: []
			});

			await expect(find()).resolves.toBeUndefined();

			expect(lookupSpy).toHaveBeenCalledOnce();
		});
	});
});
