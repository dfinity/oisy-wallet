import { onBtcWalletMessage } from '$btc/workers/btc-wallet.worker';
import { onBtcStatusesMessage } from '$icp/workers/btc-statuses.worker';
import { onCkBtcMinterInfoMessage } from '$icp/workers/ckbtc-minter-info.worker';
import { onCkBtcUpdateBalanceMessage } from '$icp/workers/ckbtc-update-balance.worker';
import { onCkEthMinterInfoMessage } from '$icp/workers/cketh-minter-info.worker';
import { onDip20WalletMessage } from '$icp/workers/dip20-wallet.worker';
import { onIcpWalletMessage } from '$icp/workers/icp-wallet.worker';
import { onIcrcWalletMessage } from '$icp/workers/icrc-wallet.worker';
import { onPowProtectionMessage } from '$icp/workers/pow-protection.worker';
import { onKaspaWalletMessage } from '$kaspa/workers/kaspa-wallet.worker';
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

export const messageToHandler: PostMessageRequestMap = {
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

	startKaspaWalletTimer: onKaspaWalletMessage,
	stopKaspaWalletTimer: onKaspaWalletMessage,
	triggerKaspaWalletTimer: onKaspaWalletMessage,

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

onmessage = async (ev: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const msg = ev.data?.msg;
	if (isNullish(msg)) {
		return;
	}

	const handler = messageToHandler[msg as PostMessageRequest];
	if (isNullish(handler)) {
		return;
	}

	try {
		await handler(ev);
	} catch (_: unknown) {
		// Silent catch, we don't want the worker to crash
		// Any errors are handled in the main thread or in the worker itself
	}
};
