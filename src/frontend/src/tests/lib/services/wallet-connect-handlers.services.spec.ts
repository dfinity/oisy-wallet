import {
	SESSION_REQUEST_BTC_SIGN_MESSAGE,
	SESSION_REQUEST_BTC_SIGN_PSBT
} from '$btc/constants/wallet-connect.constants';
import { SESSION_REQUEST_ETH_SEND_TRANSACTION } from '$eth/constants/wallet-connect.constants';
import { onSessionRequest } from '$lib/services/wallet-connect-handlers.services';
import { modalStore } from '$lib/stores/modal.store';
import { toastsStore } from '$lib/stores/toasts.store';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { SESSION_REQUEST_SOL_SIGN_MESSAGE } from '$sol/constants/wallet-connect.constants';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { get } from 'svelte/store';

describe('wallet-connect-handlers.services', () => {
	describe('onSessionRequest BTC methods', () => {
		const mockRejectRequest = vi.fn();
		const listener = {
			rejectRequest: mockRejectRequest
		} as unknown as OptionWalletConnectListener;

		const sessionRequest = (method: string): WalletKitTypes.SessionRequest =>
			({
				id: 1,
				topic: 'mock-topic',
				params: { request: { method } }
			}) as unknown as WalletKitTypes.SessionRequest;

		beforeEach(() => {
			vi.clearAllMocks();
			modalStore.close();
		});

		it.each([SESSION_REQUEST_BTC_SIGN_MESSAGE, SESSION_REQUEST_BTC_SIGN_PSBT])(
			'should open the sign modal for %s',
			async (method) => {
				const openSign = vi.spyOn(modalStore, 'openWalletConnectSign');

				await onSessionRequest({ listener, sessionRequest: sessionRequest(method) });

				expect(openSign).toHaveBeenCalledOnce();
				expect(mockRejectRequest).not.toHaveBeenCalled();
			}
		);
	});

	describe('onSessionRequest Solana signMessage', () => {
		const mockRejectRequest = vi.fn();
		const listener = {
			rejectRequest: mockRejectRequest
		} as unknown as OptionWalletConnectListener;

		const sessionRequest = {
			id: 2,
			topic: 'sol-topic',
			params: { request: { method: SESSION_REQUEST_SOL_SIGN_MESSAGE } }
		} as unknown as WalletKitTypes.SessionRequest;

		beforeEach(() => {
			vi.clearAllMocks();
			modalStore.close();
		});

		it('should open the sign modal for solana_signMessage instead of rejecting it', async () => {
			const openSign = vi.spyOn(modalStore, 'openWalletConnectSign');

			await onSessionRequest({ listener, sessionRequest });

			expect(openSign).toHaveBeenCalledOnce();
			expect(mockRejectRequest).not.toHaveBeenCalled();
		});
	});

	describe('onSessionRequest with a review already open', () => {
		const listener = {
			rejectRequest: vi.fn()
		} as unknown as OptionWalletConnectListener;

		const sessionRequest = (method: string): WalletKitTypes.SessionRequest =>
			({
				id: 3,
				topic: 'overwrite-topic',
				params: { request: { method } }
			}) as unknown as WalletKitTypes.SessionRequest;

		beforeEach(() => {
			vi.clearAllMocks();
			modalStore.close();
			toastsStore.reset();
		});

		it('should not replace an open send review with a second send request', async () => {
			modalStore.openWalletConnectSend({
				id: Symbol(),
				data: sessionRequest(SESSION_REQUEST_ETH_SEND_TRANSACTION)
			});

			const openSend = vi.spyOn(modalStore, 'openWalletConnectSend');

			await onSessionRequest({
				listener,
				sessionRequest: sessionRequest(SESSION_REQUEST_ETH_SEND_TRANSACTION)
			});

			expect(openSend).not.toHaveBeenCalled();
			expect(get(toastsStore)).toEqual([
				expect.objectContaining({ text: en.wallet_connect.error.skipping_request })
			]);
		});

		it('should not replace an open sign review with a send request', async () => {
			modalStore.openWalletConnectSign({
				id: Symbol(),
				data: sessionRequest(SESSION_REQUEST_SOL_SIGN_MESSAGE)
			});

			const openSend = vi.spyOn(modalStore, 'openWalletConnectSend');

			await onSessionRequest({
				listener,
				sessionRequest: sessionRequest(SESSION_REQUEST_ETH_SEND_TRANSACTION)
			});

			expect(openSend).not.toHaveBeenCalled();
		});

		it('should still open a review while the connect modal is up', async () => {
			modalStore.openWalletConnectAuth(Symbol());

			const openSend = vi.spyOn(modalStore, 'openWalletConnectSend');

			await onSessionRequest({
				listener,
				sessionRequest: sessionRequest(SESSION_REQUEST_ETH_SEND_TRANSACTION)
			});

			expect(openSend).toHaveBeenCalledOnce();
		});
	});
});
