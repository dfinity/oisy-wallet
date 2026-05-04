import * as ckbtcMinterApi from '$icp/api/ckbtc-minter.api';
import { loadAllCkBtcInfo, queryEstimateFee, updateBalance } from '$icp/services/ckbtc.services';
import { btcAddressStore } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCkToken } from '$icp/types/ic-token';
import { ProgressStepsUpdateBalanceCkBtc } from '$lib/enums/progress-steps';
import * as actionsServices from '$lib/services/actions.services';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import * as walletUtils from '$lib/utils/wallet.utils';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	type CkBtcMinterDid,
	type EstimateWithdrawalFee,
	MinterNoNewUtxosError
} from '@icp-sdk/canisters/ckbtc';
import { get } from 'svelte/store';

vi.mock('$icp/api/ckbtc-minter.api');

vi.mock('$lib/utils/wallet.utils', () => ({
	waitAndTriggerWallet: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('$lib/services/actions.services', () => ({
	waitWalletReady: vi.fn().mockResolvedValue('loaded')
}));

describe('ckbtc.services', () => {
	const mockProgress = vi.fn();
	const mockToken: IcCkToken = {
		...mockValidIcCkToken,
		minterCanisterId: 'mock-minter-canister-id'
	};

	const mockMinterInfo: CkBtcMinterDid.MinterInfo = {
		kyt_fee: 100n,
		retrieve_btc_min_amount: 10_000n,
		min_confirmations: 6,
		deposit_btc_min_amount: []
	};

	beforeEach(() => {
		vi.clearAllMocks();
		btcAddressStore.reinitialize();
		ckBtcPendingUtxosStore.reinitialize();
		ckBtcMinterInfoStore.reinitialize();
	});

	describe('updateBalance', () => {
		it('should show info toast when no new BTC', async () => {
			vi.mocked(ckbtcMinterApi.updateBalance).mockResolvedValue([]);

			const toastsShowSpy = vi.spyOn(toastsStore, 'toastsShow');

			await updateBalance({
				token: mockToken,
				progress: mockProgress,
				identity: mockIdentity
			});

			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsUpdateBalanceCkBtc.RETRIEVE);
			expect(toastsShowSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					text: get(i18n).receive.bitcoin.info.no_new_btc,
					level: 'info'
				})
			);
		});

		it('should clear pending UTXOs and trigger wallet when BTC received', async () => {
			vi.mocked(ckbtcMinterApi.updateBalance).mockResolvedValue([
				{
					Minted: {
						block_index: 1n,
						minted_amount: 100_000n,
						utxo: { height: 100, value: 100_000n, outpoint: { txid: new Uint8Array([1]), vout: 0 } }
					}
				}
			]);

			await updateBalance({
				token: mockToken,
				progress: mockProgress,
				identity: mockIdentity
			});

			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsUpdateBalanceCkBtc.RETRIEVE);
			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsUpdateBalanceCkBtc.RELOAD);
			expect(walletUtils.waitAndTriggerWallet).toHaveBeenCalledOnce();
		});

		it('should populate pending UTXOs on MinterNoNewUtxosError', async () => {
			const mockPendingUtxos = [
				{ value: 50_000n, confirmations: 1, outpoint: { txid: new Uint8Array([1]), vout: 0 } }
			];

			vi.mocked(ckbtcMinterApi.updateBalance).mockRejectedValue(
				new MinterNoNewUtxosError({
					pending_utxos: [mockPendingUtxos],
					required_confirmations: 3
				})
			);

			await updateBalance({
				token: mockToken,
				progress: mockProgress,
				identity: mockIdentity
			});

			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsUpdateBalanceCkBtc.RETRIEVE);
			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsUpdateBalanceCkBtc.RELOAD);

			const storeValue = get(ckBtcPendingUtxosStore);

			expect(storeValue?.[mockToken.id]).toBeDefined();
		});

		it('should rethrow non-MinterNoNewUtxosError errors', async () => {
			vi.mocked(ckbtcMinterApi.updateBalance).mockRejectedValue(new Error('Unknown error'));

			await expect(
				updateBalance({
					token: mockToken,
					progress: mockProgress,
					identity: mockIdentity
				})
			).rejects.toThrow('Unknown error');
		});

		it('should throw when minterCanisterId is nullish', async () => {
			const tokenWithoutMinter: IcCkToken = {
				...mockToken,
				minterCanisterId: undefined
			};

			await expect(
				updateBalance({
					token: tokenWithoutMinter,
					progress: mockProgress,
					identity: mockIdentity
				})
			).rejects.toThrow();
		});
	});

	describe('loadAllCkBtcInfo', () => {
		it('should skip loading when both address and info are already loaded', async () => {
			btcAddressStore.set({
				id: mockToken.id,
				data: { data: 'bc1qtest', certified: true }
			});
			ckBtcMinterInfoStore.set({
				id: mockToken.id,
				data: { data: mockMinterInfo, certified: true }
			});

			const busyStartSpy = vi.spyOn(busy, 'start');

			await loadAllCkBtcInfo({
				...mockToken,
				identity: mockIdentity
			});

			expect(busyStartSpy).not.toHaveBeenCalled();
		});

		it('should load BTC address when not yet loaded', async () => {
			ckBtcMinterInfoStore.set({
				id: mockToken.id,
				data: { data: mockMinterInfo, certified: true }
			});

			vi.mocked(ckbtcMinterApi.getBtcAddress).mockResolvedValue('bc1qnewaddress');

			const busyStartSpy = vi.spyOn(busy, 'start');
			const busyStopSpy = vi.spyOn(busy, 'stop');

			await loadAllCkBtcInfo({
				...mockToken,
				identity: mockIdentity
			});

			expect(busyStartSpy).toHaveBeenCalled();
			expect(busyStopSpy).toHaveBeenCalled();
		});

		it('should wait for minter info when not yet loaded', async () => {
			btcAddressStore.set({
				id: mockToken.id,
				data: { data: 'bc1qtest', certified: true }
			});

			vi.mocked(actionsServices.waitWalletReady).mockResolvedValue('ready');

			const busyStartSpy = vi.spyOn(busy, 'start');
			const busyStopSpy = vi.spyOn(busy, 'stop');

			await loadAllCkBtcInfo({
				...mockToken,
				identity: mockIdentity
			});

			expect(busyStartSpy).toHaveBeenCalled();
			expect(busyStopSpy).toHaveBeenCalled();
			expect(actionsServices.waitWalletReady).toHaveBeenCalled();
		});

		it('should reject when minter info loading times out', async () => {
			btcAddressStore.set({
				id: mockToken.id,
				data: { data: 'bc1qtest', certified: true }
			});

			vi.mocked(actionsServices.waitWalletReady).mockResolvedValue('timeout');

			await expect(
				loadAllCkBtcInfo({
					...mockToken,
					identity: mockIdentity
				})
			).rejects.toThrow();
		});

		it('should throw when minterCanisterId is nullish', async () => {
			const tokenWithoutMinter: IcCkToken = {
				...mockToken,
				minterCanisterId: undefined
			};

			await expect(
				loadAllCkBtcInfo({
					...tokenWithoutMinter,
					identity: mockIdentity
				})
			).rejects.toThrow();
		});
	});

	describe('queryEstimateFee', () => {
		it('should return success with fee on successful estimation', async () => {
			const mockFee: EstimateWithdrawalFee = { minter_fee: 100n, bitcoin_fee: 200n };
			vi.mocked(ckbtcMinterApi.estimateFee).mockResolvedValue(mockFee);

			const result = await queryEstimateFee({
				identity: mockIdentity,
				minterCanisterId: mockToken.minterCanisterId,
				amount: 100_000n
			});

			expect(result).toEqual({ result: 'success', fee: mockFee });
			expect(ckbtcMinterApi.estimateFee).toHaveBeenCalledWith({
				identity: mockIdentity,
				amount: 100_000n,
				minterCanisterId: mockToken.minterCanisterId,
				certified: false
			});
		});

		it('should return error and show toast on failure', async () => {
			vi.mocked(ckbtcMinterApi.estimateFee).mockRejectedValue(new Error('estimate failed'));

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			const result = await queryEstimateFee({
				identity: mockIdentity,
				minterCanisterId: mockToken.minterCanisterId,
				amount: 100_000n
			});

			expect(result).toEqual({ result: 'error' });
			expect(toastsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: get(i18n).init.error.btc_fees_estimation }
				})
			);
		});

		it('should throw when minterCanisterId is nullish', async () => {
			await expect(
				queryEstimateFee({
					identity: mockIdentity,
					minterCanisterId: undefined,
					amount: 100_000n
				})
			).rejects.toThrow();
		});
	});
});
