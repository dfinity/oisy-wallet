import { CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import { SIGNER_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import { addOwnCycles, loadOwnCycles } from '$lib/services/own-cycles.services';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

describe('own-cycles.services', () => {
	const signer = { owner: Principal.fromText(SIGNER_CANISTER_ID) };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadOwnCycles', () => {
		beforeEach(() => {
			vi.spyOn(icrcLedgerApi, 'allowance').mockResolvedValue({
				allowance: 2_000_000_000_000n,
				expires_at: []
			});
			vi.spyOn(icrcLedgerApi, 'balance').mockResolvedValue(5_000_000_000_000n);
		});

		it('returns the approval left for the signer and the TCYCLES balance', async () => {
			await expect(loadOwnCycles({ identity: mockIdentity })).resolves.toEqual({
				approved: 2_000_000_000_000n,
				balance: 5_000_000_000_000n
			});
		});

		it('reads both from the cycles ledger with queries, for the main accounts', async () => {
			await loadOwnCycles({ identity: mockIdentity });

			expect(icrcLedgerApi.allowance).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				certified: false,
				ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
				owner: { owner: mockPrincipal },
				spender: signer
			});
			expect(icrcLedgerApi.balance).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				certified: false,
				ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
				owner: mockPrincipal
			});
		});

		it('throws without an identity', async () => {
			await expect(loadOwnCycles({ identity: undefined })).rejects.toThrow();

			expect(icrcLedgerApi.allowance).not.toHaveBeenCalled();
			expect(icrcLedgerApi.balance).not.toHaveBeenCalled();
		});

		it('throws when a read fails', async () => {
			const err = new Error('Ledger unreachable');

			vi.spyOn(icrcLedgerApi, 'balance').mockRejectedValue(err);

			await expect(loadOwnCycles({ identity: mockIdentity })).rejects.toThrow(err);
		});
	});

	describe('addOwnCycles', () => {
		beforeEach(() => {
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
		});

		it('raises the approval by the amount, stating the approval it replaces, with no expiry', async () => {
			await addOwnCycles({
				identity: mockIdentity,
				approved: 2_000_000_000_000n,
				amount: 1_500_000_000_000n
			});

			expect(icrcLedgerApi.approve).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
				spender: signer,
				amount: 3_500_000_000_000n,
				expectedAllowance: 2_000_000_000_000n
			});
		});

		it('states a zero approval when none is left', async () => {
			await addOwnCycles({ identity: mockIdentity, approved: ZERO, amount: 1_000_000_000_000n });

			expect(icrcLedgerApi.approve).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ amount: 1_000_000_000_000n, expectedAllowance: ZERO })
			);
		});

		it('throws when the ledger refuses the approval', async () => {
			const err = new Error('Allowance changed');

			vi.spyOn(icrcLedgerApi, 'approve').mockRejectedValue(err);

			await expect(
				addOwnCycles({ identity: mockIdentity, approved: 1n, amount: 1_000_000_000_000n })
			).rejects.toThrow(err);
		});
	});
});
