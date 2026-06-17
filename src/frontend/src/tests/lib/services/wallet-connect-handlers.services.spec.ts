import { SESSION_REQUEST_BTC_SIGN_MESSAGE } from '$btc/constants/wallet-connect.constants';
import { onSessionRequest } from '$lib/services/wallet-connect-handlers.services';
import { modalStore } from '$lib/stores/modal.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { getSdkError } from '@walletconnect/utils';
import { get } from 'svelte/store';

describe('wallet-connect-handlers.services', () => {
	const mockListener = {
		pair: vi.fn(),
		approveSession: vi.fn(),
		rejectSession: vi.fn(),
		attachHandlers: vi.fn(),
		detachHandlers: vi.fn(),
		rejectRequest: vi.fn(),
		getActiveSessions: vi.fn(),
		approveRequest: vi.fn(),
		disconnect: vi.fn()
	} as WalletConnectListener;

	const mockSessionRequest = {
		id: 123,
		topic: 'test-topic',
		params: {
			chainId: 'bip122:000000000019d6689c085ae165831e93',
			request: { method: SESSION_REQUEST_BTC_SIGN_MESSAGE, params: { message: 'hello' } }
		}
	} as unknown as WalletKitTypes.SessionRequest;

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
	});

	afterEach(() => {
		modalStore.close();
	});

	describe('onSessionRequest', () => {
		it('rejects the request when another non-WalletConnect modal is open', async () => {
			const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			modalStore.openSend({ id: Symbol('send-modal') });

			await onSessionRequest({
				listener: mockListener,
				sessionRequest: mockSessionRequest
			});

			expect(mockListener.rejectRequest).toHaveBeenCalledExactlyOnceWith({
				topic: mockSessionRequest.topic,
				id: mockSessionRequest.id,
				error: getSdkError('USER_REJECTED')
			});

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.wallet_connect.error.skipping_request }
			});

			expect(get(modalStore)?.type).toBe('send');
		});
	});
});
