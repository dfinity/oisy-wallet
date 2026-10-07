import { IC_CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import {
	getTopUpCanister,
	isCyclesLedger,
	isTopUpRefundMemo,
	mapCyclesLedgerTransaction
} from '$icp/utils/cycles-ledger-transactions.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import {
	createMockIcrcBurnTransaction,
	createMockIcrcMintTransaction,
	createMockIcrcTransferTransaction
} from '$tests/mocks/ic-transactions.mock';
import { mockIdentity, mockPrincipalText2 } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

describe('cycles-ledger-transactions.utils', () => {
	const canister = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

	// As mainnet block 16,786,001 carries it.
	const topUpMemo = Uint8Array.from([0x81, 0x4a, ...canister.toUint8Array()]);

	const refundMemo = new Uint8Array(32).fill(0xff);

	describe('isCyclesLedger', () => {
		it('should recognise the cycles ledger', () => {
			expect(isCyclesLedger({ ledgerCanisterId: IC_CYCLES_LEDGER_CANISTER_ID })).toBeTruthy();
		});

		it('should not recognise another ledger', () => {
			expect(isCyclesLedger({ ledgerCanisterId: mockPrincipalText2 })).toBeFalsy();
		});
	});

	describe('getTopUpCanister', () => {
		it('should read the canister from a top-up memo', () => {
			expect(getTopUpCanister(topUpMemo)?.toText()).toBe(canister.toText());
		});

		it('should not read a memo without the top-up prefix', () => {
			// The same canister as a one-entry CBOR map instead of an array.
			expect(
				getTopUpCanister(Uint8Array.from([0xa1, 0x00, 0x4a, ...canister.toUint8Array()]))
			).toBeUndefined();
		});

		it('should not read a memo of another length', () => {
			expect(getTopUpCanister(topUpMemo.slice(0, 11))).toBeUndefined();
			expect(getTopUpCanister(Uint8Array.from([...topUpMemo, 0x00]))).toBeUndefined();
		});

		it('should not read a missing or empty memo', () => {
			expect(getTopUpCanister(undefined)).toBeUndefined();
			expect(getTopUpCanister(new Uint8Array())).toBeUndefined();
		});
	});

	describe('isTopUpRefundMemo', () => {
		it('should recognise the refund memo', () => {
			expect(isTopUpRefundMemo(refundMemo)).toBeTruthy();
		});

		it('should not recognise the memo of a canister creation', () => {
			expect(isTopUpRefundMemo(new Uint8Array(32).fill(0xfe))).toBeFalsy();
		});

		it('should not recognise a shorter memo or none', () => {
			expect(isTopUpRefundMemo(new Uint8Array(31).fill(0xff))).toBeFalsy();
			expect(isTopUpRefundMemo(undefined)).toBeFalsy();
		});
	});

	describe('mapCyclesLedgerTransaction', () => {
		it('should label a top-up and name its canister as the destination', () => {
			const transaction = createMockIcrcBurnTransaction({ memo: topUpMemo });

			const result = mapCyclesLedgerTransaction({ transaction, identity: mockIdentity });

			expect(result).toEqual({
				...mapIcrcTransaction({ transaction, identity: mockIdentity }),
				to: canister.toText(),
				typeLabel: 'transaction.label.top_up'
			});
			expect(result.type).toBe('burn');
		});

		it('should keep a burn with another memo, or none, a plain burn', () => {
			const otherMemo = createMockIcrcBurnTransaction({ memo: new Uint8Array(32).fill(0xfe) });
			const noMemo = createMockIcrcBurnTransaction();

			expect(
				mapCyclesLedgerTransaction({ transaction: otherMemo, identity: mockIdentity })
			).toEqual(mapIcrcTransaction({ transaction: otherMemo, identity: mockIdentity }));
			expect(mapCyclesLedgerTransaction({ transaction: noMemo, identity: mockIdentity })).toEqual(
				mapIcrcTransaction({ transaction: noMemo, identity: mockIdentity })
			);
		});

		it('should label the refund of a failed top-up', () => {
			const transaction = createMockIcrcMintTransaction({ memo: refundMemo });

			const result = mapCyclesLedgerTransaction({ transaction, identity: mockIdentity });

			expect(result).toEqual({
				...mapIcrcTransaction({ transaction, identity: mockIdentity }),
				typeLabel: 'transaction.label.top_up_refund'
			});
			expect(result.type).toBe('mint');
		});

		it('should keep another mint a plain mint', () => {
			const transaction = createMockIcrcMintTransaction();

			expect(mapCyclesLedgerTransaction({ transaction, identity: mockIdentity })).toEqual(
				mapIcrcTransaction({ transaction, identity: mockIdentity })
			);
		});

		it('should keep a transfer as it is, whatever its memo', () => {
			const transaction = createMockIcrcTransferTransaction({ memo: topUpMemo });

			expect(mapCyclesLedgerTransaction({ transaction, identity: mockIdentity })).toEqual(
				mapIcrcTransaction({ transaction, identity: mockIdentity })
			);
		});
	});
});
