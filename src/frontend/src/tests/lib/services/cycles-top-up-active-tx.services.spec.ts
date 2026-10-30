import type { CyclesTopUpData } from '$declarations/backend/backend.did';
import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import * as icpIndexApi from '$icp/api/icp-index.api';
import { CMC_MINT_CYCLES_MEMO, CMC_TOP_UP_MEMO } from '$icp/constants/cmc.constants';
import { getCmcDepositAccountIdentifier } from '$icp/utils/cmc.utils';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import { findCyclesTopUpDeposit } from '$lib/services/cycles-top-up-active-tx.services';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

const CANISTER_ID = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

const data: CyclesTopUpData = {
	source_token: { IcpNative: null },
	canister_id: CANISTER_ID,
	amount: 100_000_000n,
	transfer_created_at_ns: 1_790_000_000_000_000_000n
};

const DEPOSIT_ACCOUNT_IDENTIFIER = getCmcDepositAccountIdentifier(CANISTER_ID);
const OWN_ACCOUNT_IDENTIFIER = getAccountIdentifier(mockPrincipal).toHex();

const transfer = ({
	id,
	memo = CMC_TOP_UP_MEMO,
	from = OWN_ACCOUNT_IDENTIFIER
}: {
	id: bigint;
	memo?: Uint8Array;
	from?: string;
}): IcpIndexDid.TransactionWithId => ({
	id,
	transaction: {
		memo: ZERO,
		icrc1_memo: [memo],
		operation: {
			Transfer: {
				to: DEPOSIT_ACCOUNT_IDENTIFIER,
				fee: { e8s: 10_000n },
				from,
				amount: { e8s: data.amount },
				spender: []
			}
		},
		timestamp: [{ timestamp_nanos: data.transfer_created_at_ns + id }],
		created_at_time: [{ timestamp_nanos: data.transfer_created_at_ns }]
	}
});

describe('cycles-top-up-active-tx.services', () => {
	describe('findCyclesTopUpDeposit', () => {
		let lookupSpy: ReturnType<typeof vi.spyOn>;

		const find = () => findCyclesTopUpDeposit({ identity: mockIdentity, data });

		beforeEach(() => {
			vi.restoreAllMocks();

			lookupSpy = vi
				.spyOn(icpIndexApi, 'getAccountIdentifierTransactions')
				.mockResolvedValue({ balance: ZERO, transactions: [], oldest_tx_id: [] });
		});

		it('reads the certified history of the canister’s CMC deposit account, not the caller’s', async () => {
			await find();

			expect(lookupSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					accountIdentifier: DEPOSIT_ACCOUNT_IDENTIFIER,
					indexCanisterId: ICP_INDEX_CANISTER_ID,
					certified: true
				})
			);
			expect(lookupSpy).not.toHaveBeenCalledWith(
				expect.objectContaining({
					accountIdentifier: getCmcDepositAccountIdentifier(mockPrincipal)
				})
			);
		});

		it('finds the caller’s transfer with the TPUP memo', async () => {
			lookupSpy.mockResolvedValueOnce({
				balance: ZERO,
				transactions: [transfer({ id: 20n })],
				oldest_tx_id: []
			});

			await expect(find()).resolves.toBe(20n);
		});

		// Everyone who tops the canister up through the CMC pays into the same account.
		it('passes over the same transfer from someone else, and a transfer with the MINT memo', async () => {
			lookupSpy.mockResolvedValueOnce({
				balance: ZERO,
				transactions: [
					transfer({ id: 22n, from: 'another-account' }),
					transfer({ id: 21n, memo: CMC_MINT_CYCLES_MEMO }),
					transfer({ id: 20n })
				],
				oldest_tx_id: []
			});

			await expect(find()).resolves.toBe(20n);
		});
	});
});
