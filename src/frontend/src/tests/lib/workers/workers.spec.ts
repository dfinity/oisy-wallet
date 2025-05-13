import { onBtcWalletMessage } from '$btc/workers/btc-wallet.worker';
import { onBtcStatusesMessage } from '$icp/workers/btc-statuses.worker';
import { onCkBtcMinterInfoMessage } from '$icp/workers/ckbtc-minter-info.worker';
import { onCkBtcUpdateBalanceMessage } from '$icp/workers/ckbtc-update-balance.worker';
import { onCkEthMinterInfoMessage } from '$icp/workers/cketh-minter-info.worker';
import { onDip20WalletMessage } from '$icp/workers/dip20-wallet.worker';
import { onIcpWalletMessage } from '$icp/workers/icp-wallet.worker';
import { onIcrcWalletMessage } from '$icp/workers/icrc-wallet.worker';
import { onPowProtectionMessage } from '$icp/workers/pow-protection.worker';
import { POST_MESSAGE_REQUESTS } from '$lib/schema/post-message.schema';
import { onAuthMessage } from '$lib/workers/auth.worker';
import { onExchangeMessage } from '$lib/workers/exchange.worker';
import '$lib/workers/workers';
import { onSolWalletMessage } from '$sol/workers/sol-wallet.worker';
import { createMockEvent } from '$tests/mocks/workers.mock';

vi.mock('$lib/workers/auth.worker', () => ({
	onAuthMessage: vi.fn()
}));

vi.mock('$lib/workers/exchange.worker', () => ({
	onExchangeMessage: vi.fn()
}));

vi.mock('$btc/workers/btc-wallet.worker', () => ({
	onBtcWalletMessage: vi.fn()
}));

vi.mock('$icp/workers/btc-statuses.worker', () => ({
	onBtcStatusesMessage: vi.fn()
}));

vi.mock('$icp/workers/ckbtc-minter-info.worker', () => ({
	onCkBtcMinterInfoMessage: vi.fn()
}));

vi.mock('$icp/workers/ckbtc-update-balance.worker', () => ({
	onCkBtcUpdateBalanceMessage: vi.fn()
}));

vi.mock('$icp/workers/cketh-minter-info.worker', () => ({
	onCkEthMinterInfoMessage: vi.fn()
}));

vi.mock('$icp/workers/icp-wallet.worker', () => ({
	onIcpWalletMessage: vi.fn()
}));

vi.mock('$icp/workers/icrc-wallet.worker', () => ({
	onIcrcWalletMessage: vi.fn()
}));

vi.mock('$icp/workers/dip20-wallet.worker', () => ({
	onDip20WalletMessage: vi.fn()
}));

vi.mock('$icp/workers/pow-protection.worker', () => ({
	onPowProtectionMessage: vi.fn()
}));

vi.mock('$sol/workers/sol-wallet.worker', () => ({
	onSolWalletMessage: vi.fn()
}));

describe('workers', () => {
	describe('onmessage', () => {
		const mockEvent = createMockEvent('mock-event');

		const onMessageFunctions = [
			{ name: 'onAuthMessage', onMessageFn: onAuthMessage },
			{ name: 'onExchangeMessage', onMessageFn: onExchangeMessage },
			{ name: 'onBtcWalletMessage', onMessageFn: onBtcWalletMessage },
			{ name: 'onBtcStatusesMessage', onMessageFn: onBtcStatusesMessage },
			{ name: 'onCkBtcMinterInfoMessage', onMessageFn: onCkBtcMinterInfoMessage },
			{ name: 'onCkBtcUpdateBalanceMessage', onMessageFn: onCkBtcUpdateBalanceMessage },
			{ name: 'onCkEthMinterInfoMessage', onMessageFn: onCkEthMinterInfoMessage },
			{ name: 'onIcpWalletMessage', onMessageFn: onIcpWalletMessage },
			{ name: 'onIcrcWalletMessage', onMessageFn: onIcrcWalletMessage },
			{ name: 'onDip20WalletMessage', onMessageFn: onDip20WalletMessage },
			{ name: 'onSolWalletMessage', onMessageFn: onSolWalletMessage },
			{ name: 'onPowProtectionMessage', onMessageFn: onPowProtectionMessage }
		];

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call all handlers with any message', async () => {
			// @ts-expect-error global onmessage is defined in the worker
			await onmessage(mockEvent);

			onMessageFunctions.forEach(({ onMessageFn }) => {
				expect(onMessageFn).toHaveBeenCalledOnce();
				expect(onMessageFn).toHaveBeenNthCalledWith(1, mockEvent);
			});
		});

		it.each(POST_MESSAGE_REQUESTS)(`should call all handlers with message %s`, async (msg) => {
			const event = createMockEvent(msg);

			// @ts-expect-error global onmessage is defined in the worker
			await onmessage(event);

			onMessageFunctions.forEach(({ onMessageFn }) => {
				expect(onMessageFn).toHaveBeenCalledOnce();
				expect(onMessageFn).toHaveBeenNthCalledWith(1, event);
			});
		});

		it.each(onMessageFunctions)(`should ignore errors from $name`, async ({ onMessageFn }) => {
			vi.mocked(onMessageFn).mockRejectedValueOnce(new Error('Test error'));

			// @ts-expect-error global onmessage is defined in the worker
			await onmessage(mockEvent);

			onMessageFunctions.forEach(({ onMessageFn }) => {
				expect(onMessageFn).toHaveBeenCalledOnce();
				expect(onMessageFn).toHaveBeenNthCalledWith(1, mockEvent);
			});
		});
	});
});
