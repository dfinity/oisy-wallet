import {
	SESSION_REQUEST_BTC_SIGN_MESSAGE,
	SESSION_REQUEST_BTC_SIGN_PSBT
} from '$btc/constants/wallet-connect.constants';
import { onSessionRequest } from '$lib/services/wallet-connect-handlers.services';
import { modalStore } from '$lib/stores/modal.store';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { SESSION_REQUEST_SOL_SIGN_MESSAGE } from '$sol/constants/wallet-connect.constants';
import type { WalletKitTypes } from '@reown/walletkit';

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
});
