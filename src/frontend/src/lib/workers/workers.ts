import { onBtcWalletMessage } from '$btc/workers/btc-wallet.worker';
import { onBtcStatusesMessage } from '$icp/workers/btc-statuses.worker';
import { onCkBtcMinterInfoMessage } from '$icp/workers/ckbtc-minter-info.worker';
import { onCkBtcUpdateBalanceMessage } from '$icp/workers/ckbtc-update-balance.worker';
import { onCkEthMinterInfoMessage } from '$icp/workers/cketh-minter-info.worker';
import { onDip20WalletMessage } from '$icp/workers/dip20-wallet.worker';
import { onIcpWalletMessage } from '$icp/workers/icp-wallet.worker';
import { onIcrcWalletMessage } from '$icp/workers/icrc-wallet.worker';
import { onPowProtectionMessage } from '$icp/workers/pow-protection.worker';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { onAuthMessage } from '$lib/workers/auth.worker';
import { onExchangeMessage } from '$lib/workers/exchange.worker';
import { onSolWalletMessage } from '$sol/workers/sol-wallet.worker';

onmessage = async (msg: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	await Promise.allSettled([
		onAuthMessage(msg),
		onExchangeMessage(msg),
		onBtcWalletMessage(msg),
		onBtcStatusesMessage(msg),
		onCkBtcMinterInfoMessage(msg),
		onCkBtcUpdateBalanceMessage(msg),
		onCkEthMinterInfoMessage(msg),
		onIcpWalletMessage(msg),
		onIcrcWalletMessage(msg),
		onDip20WalletMessage(msg),
		onSolWalletMessage(msg),
		onPowProtectionMessage(msg)
	]);
};
