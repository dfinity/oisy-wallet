import type { _SERVICE as XtcLedgerService } from '$declarations/xtc_ledger/xtc_ledger.did';
import { XtcLedgerCanister } from '$icp/canisters/xtc-ledger.canister';
import type { XtcLedgerTransferParams } from '$icp/types/xtc-ledger';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';

describe('xtc-ledger.canister', () => {
	const createXtcLedgerCanister = ({
		serviceOverride
	}: Pick<
		CreateCanisterOptions<XtcLedgerService>,
		'serviceOverride'
	>): Promise<XtcLedgerCanister> =>
		XtcLedgerCanister.create({
			canisterId: Principal.fromText('aanaa-xaaaa-aaaah-aaeiq-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<XtcLedgerService>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('transfer', () => {
		const amount = 123n;

		const params: XtcLedgerTransferParams = { to: mockPrincipal, amount };

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the transfer method', async () => {
			const txReceipt = 12345n;
			const response = { Ok: txReceipt };
			service.transfer.mockResolvedValue(response);

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = await transfer(params);

			expect(res).toEqual(txReceipt);
			expect(service.transfer).toHaveBeenCalledOnce();
			expect(service.transfer).toHaveBeenNthCalledWith(1, mockPrincipal, amount);
		});

		it('should throw an error if transfer returns a NotifyDfxFailed error', async () => {
			service.transfer.mockResolvedValue({ Err: { NotifyDfxFailed: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Notify DFX failed'));
		});

		it('should throw an error if transfer returns an InsufficientAllowance error', async () => {
			service.transfer.mockResolvedValue({ Err: { InsufficientAllowance: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Insufficient allowance'));
		});

		it('should throw an error if transfer returns an UnexpectedCyclesResponse error', async () => {
			service.transfer.mockResolvedValue({ Err: { UnexpectedCyclesResponse: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Unexpected cycles response'));
		});

		it('should throw an error if transfer returns an InsufficientBalance error', async () => {
			service.transfer.mockResolvedValue({ Err: { InsufficientBalance: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Insufficient balance'));
		});

		it('should throw an error if transfer returns an InsufficientXTCFee error', async () => {
			service.transfer.mockResolvedValue({ Err: { InsufficientXTCFee: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Insufficient XTC fee'));
		});

		it('should throw an error if transfer returns an ErrorOperationStyle error', async () => {
			service.transfer.mockResolvedValue({ Err: { ErrorOperationStyle: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Error operation style'));
		});

		it('should throw an error if transfer returns an Unauthorized error', async () => {
			service.transfer.mockResolvedValue({ Err: { Unauthorized: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Unauthorized'));
		});

		it('should throw an error if transfer returns a LedgerTrap error', async () => {
			service.transfer.mockResolvedValue({ Err: { LedgerTrap: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Ledger trap'));
		});

		it('should throw an error if transfer returns an ErrorTo error', async () => {
			service.transfer.mockResolvedValue({ Err: { ErrorTo: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Error To'));
		});

		it('should throw an error if transfer returns an Other error', async () => {
			service.transfer.mockResolvedValue({ Err: { Other: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Other'));
		});

		it('should throw an error if transfer returns a FetchRateFailed error', async () => {
			service.transfer.mockResolvedValue({ Err: { FetchRateFailed: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Fetch rate failed'));
		});

		it('should throw an error if transfer returns a BlockUsed error', async () => {
			service.transfer.mockResolvedValue({ Err: { BlockUsed: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Block used'));
		});

		it('should throw an error if transfer returns an AmountTooSmall error', async () => {
			service.transfer.mockResolvedValue({ Err: { AmountTooSmall: null } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Amount too small'));
		});

		it('should throw an error if transfer returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.transfer.mockResolvedValue({ Err: { test: 'unexpected' } });

			const { transfer } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = transfer(params);

			await expect(res).rejects.toThrow(
				new CanisterInternalError('Unknown XtcLedgerCanisterError')
			);
		});
	});

	describe('balance', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the balance method', async () => {
			const mockBalance = 12345n;
			service.balanceOf.mockResolvedValue(mockBalance);

			const { balance } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = await balance(mockPrincipal);

			expect(res).toEqual(mockBalance);
			expect(service.balanceOf).toHaveBeenCalledOnce();
			expect(service.balanceOf).toHaveBeenNthCalledWith(1, mockPrincipal);
		});

		it('should throw an error if balance throws', async () => {
			const mockError = new Error('Test response error');
			service.balanceOf.mockRejectedValue(mockError);

			const { balance } = await createXtcLedgerCanister({
				serviceOverride: service
			});

			const res = balance(mockPrincipal);

			await expect(res).rejects.toThrow(mockError);
		});
	});
});
