import { IC_CKSOL_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.sol.env';
import { isCkSolActivityLedger, mapCkSolTransaction } from '$icp/utils/cksol-transactions.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import {
	mockCkSolBurnMemo,
	mockCkSolMintMemo,
	mockCkSolSweepSignature
} from '$tests/mocks/cksol.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import {
	createMockIcrcBurnTransaction,
	createMockIcrcMintTransaction,
	createMockIcrcTransferTransaction
} from '$tests/mocks/ic-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

let mockCkSolEnabled = true;

vi.mock('$env/cksol.env', () => ({
	get CKSOL_ENABLED() {
		return mockCkSolEnabled;
	}
}));

describe('cksol-transactions.utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockCkSolEnabled = true;
	});

	describe('isCkSolActivityLedger', () => {
		it('should take the ckSOL ledger where ckSOL is enabled', () => {
			expect(isCkSolActivityLedger({ ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID })).toBeTruthy();
		});

		// A ckSOL added by hand where OISY does not list it has no twin to name its conversions after.
		it('should leave the ckSOL ledger to the plain ICRC rows where ckSOL is not enabled', () => {
			mockCkSolEnabled = false;

			expect(isCkSolActivityLedger({ ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID })).toBeFalsy();
		});

		it('should not take another ledger', () => {
			expect(isCkSolActivityLedger(mockValidIcrcToken)).toBeFalsy();
		});
	});

	describe('mapCkSolTransaction', () => {
		it('should read a mint as converted from SOL, with the Solana transaction that swept the deposit', () => {
			const transaction = createMockIcrcMintTransaction({ memo: mockCkSolMintMemo() });

			expect(mapCkSolTransaction({ transaction, identity: mockIdentity })).toStrictEqual({
				...mapIcrcTransaction({ transaction, identity: mockIdentity }),
				typeLabel: 'transaction.label.twin_token_converted',
				fromLabel: 'transaction.label.twin_network',
				twinTransaction: {
					id: mockCkSolSweepSignature,
					explorerUrl: `https://solscan.io/tx/${mockCkSolSweepSignature}/`
				}
			});
		});

		it('should read a mint without a memo as converted from SOL, without a Solana transaction', () => {
			const transaction = createMockIcrcMintTransaction();

			expect(mapCkSolTransaction({ transaction, identity: mockIdentity })).toStrictEqual({
				...mapIcrcTransaction({ transaction, identity: mockIdentity }),
				typeLabel: 'transaction.label.twin_token_converted',
				fromLabel: 'transaction.label.twin_network'
			});
		});

		it('should leave out the Solana transaction of a mint whose memo does not decode', () => {
			const spyConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = mapCkSolTransaction({
				transaction: createMockIcrcMintTransaction({ memo: mockCkSolBurnMemo(mockSolAddress) }),
				identity: mockIdentity
			});

			expect(result.typeLabel).toBe('transaction.label.twin_token_converted');
			expect(result.twinTransaction).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledOnce();
		});

		it('should read a burn as a send to the Solana address in its memo', () => {
			const transaction = createMockIcrcBurnTransaction({
				memo: mockCkSolBurnMemo(mockSolAddress)
			});

			expect(mapCkSolTransaction({ transaction, identity: mockIdentity })).toStrictEqual({
				...mapIcrcTransaction({ transaction, identity: mockIdentity }),
				typeLabel: 'send.text.send',
				to: mockSolAddress,
				toExplorerUrl: `https://solscan.io/account/${mockSolAddress}/`
			});
		});

		it('should name the Solana network for a burn without a memo', () => {
			const result = mapCkSolTransaction({
				transaction: createMockIcrcBurnTransaction(),
				identity: mockIdentity
			});

			expect(result.typeLabel).toBe('send.text.send');
			expect(result.toLabel).toBe('transaction.label.twin_network');
			expect(result.to).toBeUndefined();
			expect(result.toExplorerUrl).toBeUndefined();
		});

		it('should name the Solana network for a burn whose memo does not decode', () => {
			const spyConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = mapCkSolTransaction({
				transaction: createMockIcrcBurnTransaction({ memo: Uint8Array.from([0xff]) }),
				identity: mockIdentity
			});

			expect(result.toLabel).toBe('transaction.label.twin_network');
			expect(result.to).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledOnce();
		});

		it('should leave a transfer as any ICRC transfer', () => {
			const transaction = createMockIcrcTransferTransaction({ id: 1n, amount: 5n });

			expect(mapCkSolTransaction({ transaction, identity: mockIdentity })).toStrictEqual(
				mapIcrcTransaction({ transaction, identity: mockIdentity })
			);
		});
	});
});
