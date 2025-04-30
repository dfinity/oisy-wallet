import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { balance, transactionFee } from '$icp/api/icrc-ledger.api';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { IcrcLedgerCanister, type IcrcAccount } from '@dfinity/ledger-icrc';
import { mock } from 'vitest-mock-extended';

describe('icrc-ledger.api', () => {
	const ledgerCanisterMock = mock<IcrcLedgerCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
	});

	describe('balance', () => {
		const params = {
			certified: true,
			owner: mockPrincipal,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity
		};

		const balanceE8s = 314_000_000n;

		const account: IcrcAccount = {
			owner: mockPrincipal
		};

		beforeEach(() => {
			ledgerCanisterMock.balance.mockResolvedValue(balanceE8s);
		});

		it('successfully calls balance endpoint', async () => {
			const tokens = await balance(params);

			expect(tokens).toEqual(balanceE8s);
			expect(ledgerCanisterMock.balance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.balance).toHaveBeenCalledWith({
				certified: true,
				...account
			});
		});

		it('successfully calls balance endpoint as query', async () => {
			const tokens = await balance({
				...params,
				certified: false
			});

			expect(tokens).toEqual(balanceE8s);
			expect(ledgerCanisterMock.balance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.balance).toHaveBeenCalledWith({
				certified: false,
				...account
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(
				balance({
					certified: true,
					owner: mockPrincipal,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					identity: undefined
				})
			).rejects.toThrow();
		});
	});

	describe('transactionFee', () => {
		const params = {
			certified: true,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity
		};

		const fee = 1_000n;

		beforeEach(() => {
			ledgerCanisterMock.transactionFee.mockResolvedValue(fee);
		});

		it('successfully calls transactionFee endpoint', async () => {
			const result = await transactionFee(params);

			expect(result).toEqual(fee);
			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledWith({
				certified: true
			});
		});

		it('successfully calls transactionFee endpoint as query', async () => {
			const result = await transactionFee({
				...params,
				certified: false
			});

			expect(result).toEqual(fee);
			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledWith({
				certified: false
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(
				transactionFee({
					certified: true,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					identity: undefined
				})
			).rejects.toThrow();
		});
	});
});
