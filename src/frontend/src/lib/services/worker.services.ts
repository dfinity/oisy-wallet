import { onBtcWalletMessage } from '$btc/workers/btc-wallet.worker';
import { onBtcStatusesMessage } from '$icp/workers/btc-statuses.worker';
import { onCkBtcMinterInfoMessage } from '$icp/workers/ckbtc-minter-info.worker';
import { onCkBtcUpdateBalanceMessage } from '$icp/workers/ckbtc-update-balance.worker';
import { onCkEthMinterInfoMessage } from '$icp/workers/cketh-minter-info.worker';
import { onDip20WalletMessage } from '$icp/workers/dip20-wallet.worker';
import { onIcpWalletMessage } from '$icp/workers/icp-wallet.worker';
import { onIcrcWalletMessage } from '$icp/workers/icrc-wallet.worker';
import { onPowProtectionMessage } from '$icp/workers/pow-protection.worker';
import type {
	PostMessage,
	PostMessageDataRequest,
	PostMessageRequest,
	PostMessageRequestMap
} from '$lib/types/post-message';
import { onAuthMessage } from '$lib/workers/auth.worker';
import { onExchangeMessage } from '$lib/workers/exchange.worker';
import { onSolWalletMessage } from '$sol/workers/sol-wallet.worker';
import { isNullish } from '@dfinity/utils';

const queue: MessageEvent<PostMessage<PostMessageDataRequest>>[] = [];

let busy = false;

const messageToHandler: PostMessageRequestMap = {
	startIdleTimer: onAuthMessage,
	stopIdleTimer: onAuthMessage,

	startExchangeTimer: onExchangeMessage,
	stopExchangeTimer: onExchangeMessage,

	startPowProtectionTimer: onPowProtectionMessage,
	triggerPowProtectionTimer: onPowProtectionMessage,
	stopPowProtectionTimer: onPowProtectionMessage,

	startIcpWalletTimer: onIcpWalletMessage,
	stopIcpWalletTimer: onIcpWalletMessage,
	triggerIcpWalletTimer: onIcpWalletMessage,

	startIcrcWalletTimer: onIcrcWalletMessage,
	stopIcrcWalletTimer: onIcrcWalletMessage,
	triggerIcrcWalletTimer: onIcrcWalletMessage,

	startDip20WalletTimer: onDip20WalletMessage,
	stopDip20WalletTimer: onDip20WalletMessage,
	triggerDip20WalletTimer: onDip20WalletMessage,

	startBtcWalletTimer: onBtcWalletMessage,
	stopBtcWalletTimer: onBtcWalletMessage,
	triggerBtcWalletTimer: onBtcWalletMessage,

	startSolWalletTimer: onSolWalletMessage,
	stopSolWalletTimer: onSolWalletMessage,
	triggerSolWalletTimer: onSolWalletMessage,

	startBtcStatusesTimer: onBtcStatusesMessage,
	stopBtcStatusesTimer: onBtcStatusesMessage,
	triggerBtcStatusesTimer: onBtcStatusesMessage,

	startCkBTCUpdateBalanceTimer: onCkBtcUpdateBalanceMessage,
	stopCkBTCUpdateBalanceTimer: onCkBtcUpdateBalanceMessage,

	startCkEthMinterInfoTimer: onCkEthMinterInfoMessage,
	stopCkEthMinterInfoTimer: onCkEthMinterInfoMessage,
	triggerCkEthMinterInfoTimer: onCkEthMinterInfoMessage,

	startCkBtcMinterInfoTimer: onCkBtcMinterInfoMessage,
	stopCkBtcMinterInfoTimer: onCkBtcMinterInfoMessage,
	triggerCkBtcMinterInfoTimer: onCkBtcMinterInfoMessage
};

const processNext = async () => {
	const ev = queue.shift();

	if (isNullish(ev)) {
		// Signal back-pressure relief to main (optional)
		postMessage({ type: 'idle' });

		busy = false;

		return;
	}

	busy = true;

	const handler = messageToHandler[ev.data.msg as PostMessageRequest];

	try {
		await handler?.(ev);
	} catch (_: unknown) {
		// Silent catch, we don't want the worker to crash
		// Any errors are handled in the main thread or in the worker itself
	} finally {
		busy = false;

		// Next tick to keep UI responsive
		setTimeout(processNext, 1_000);
	}
};

export const enqueue = async (ev: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	queue.push(ev);

	if (!busy) {
		await processNext();
	}
};
