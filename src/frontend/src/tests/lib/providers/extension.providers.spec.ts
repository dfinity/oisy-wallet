import { OISY_EXTENSION_ID, OISY_EXTENSION_PORT_NAME } from '$lib/constants/extension.constants';
import {
	connectExtension,
	ExtensionWalletConnectListener
} from '$lib/providers/extension.providers';
import type { ExtensionPort } from '$lib/types/extension';
import { getSdkError } from '@walletconnect/utils';

describe('extension.providers', () => {
	describe('connectExtension', () => {
		const port: ExtensionPort = {
			postMessage: vi.fn(),
			disconnect: vi.fn(),
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() }
		};

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('returns undefined when no extension exposes chrome.runtime to the page', () => {
			vi.stubGlobal('chrome', undefined);

			expect(connectExtension()).toBeUndefined();
		});

		it('connects only to the pinned extension ID', () => {
			const connect = vi.fn().mockReturnValue(port);
			vi.stubGlobal('chrome', { runtime: { connect } });

			expect(connectExtension()).toBe(port);
			expect(connect).toHaveBeenCalledExactlyOnceWith(OISY_EXTENSION_ID, {
				name: OISY_EXTENSION_PORT_NAME
			});
		});

		it('returns undefined when the browser refuses the connection', () => {
			const connect = vi.fn().mockImplementation(() => {
				throw new Error('Could not establish connection.');
			});
			vi.stubGlobal('chrome', { runtime: { connect } });

			expect(connectExtension()).toBeUndefined();
		});
	});

	describe('ExtensionWalletConnectListener', () => {
		const onApprove = vi.fn();
		const onReject = vi.fn();

		const listener = new ExtensionWalletConnectListener({ onApprove, onReject });

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('hands an approval to the extension', async () => {
			await listener.approveRequest({ id: 1, topic: 'topic', message: '0xsignature' });

			expect(onApprove).toHaveBeenCalledExactlyOnceWith('0xsignature');
			expect(onReject).not.toHaveBeenCalled();
		});

		it('hands a rejection to the extension', async () => {
			const error = getSdkError('USER_REJECTED');

			await listener.rejectRequest({ id: 1, topic: 'topic', error });

			expect(onReject).toHaveBeenCalledExactlyOnceWith(error);
			expect(onApprove).not.toHaveBeenCalled();
		});

		it('has no WalletConnect sessions', () => {
			expect(listener.getActiveSessions()).toEqual({});
		});

		it('refuses WalletConnect pairing', async () => {
			await expect(listener.pair()).rejects.toThrow();
		});
	});
});
