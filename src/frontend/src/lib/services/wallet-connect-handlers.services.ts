import {
	SESSION_REQUEST_BTC_GET_ACCOUNT_ADDRESSES,
	SESSION_REQUEST_BTC_SIGN_MESSAGE,
	SESSION_REQUEST_BTC_SIGN_PSBT
} from '$btc/constants/wallet-connect.constants';
import { getAccountAddresses } from '$btc/services/wallet-connect.services';
import { BTC_WALLET_CONNECT_ENABLED } from '$env/btc-wallet-connect.env';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import {
	SESSION_REQUEST_ETH_SEND_TRANSACTION,
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_LEGACY,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet
} from '$lib/derived/address.derived';
import { authIdentity } from '$lib/derived/auth.derived';
import { modalUniversalScannerOpen, modalWalletConnect } from '$lib/derived/modal.derived';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import { walletConnectProposalStore as proposalStore } from '$lib/stores/wallet-connect.store';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { WalletKitTypes } from '@reown/walletkit';
import { getSdkError } from '@walletconnect/utils';
import { get } from 'svelte/store';

export const onSessionProposal = (sessionProposal: WalletKitTypes.SessionProposal) => {
	proposalStore.set(sessionProposal);
};

export const onSessionDelete = ({
	listener,
	callback
}: {
	listener: OptionWalletConnectListener;
	callback?: () => void;
}) => {
	// Prevent race condition
	if (isNullish(listener)) {
		return;
	}

	toastsShow({
		text: get(i18n).wallet_connect.info.session_ended,
		level: 'info',
		duration: 2000
	});

	callback?.();
};

export const onSessionRequest = async ({
	listener,
	sessionRequest
}: {
	listener: OptionWalletConnectListener;
	sessionRequest: WalletKitTypes.SessionRequest;
}) => {
	// Prevent race condition
	if (isNullish(listener)) {
		return;
	}

	// Another modal, like Send or Receive, is already in progress
	if (nonNullish(get(modalStore)) && !get(modalWalletConnect) && !get(modalUniversalScannerOpen)) {
		toastsError({
			msg: {
				text: get(i18n).wallet_connect.error.skipping_request
			}
		});
		return;
	}

	const {
		id,
		topic,
		params: {
			request: { method }
		}
	} = sessionRequest;

	// Defense in depth: when BTC WalletConnect is disabled, bip122 is not advertised, but a
	// previously-approved session (or a non-conforming client) could still deliver a bip122 request.
	// Reject the BTC methods outright so signing can never be reached while the feature is off.
	if (
		!BTC_WALLET_CONNECT_ENABLED &&
		[
			SESSION_REQUEST_BTC_SIGN_MESSAGE,
			SESSION_REQUEST_BTC_SIGN_PSBT,
			SESSION_REQUEST_BTC_GET_ACCOUNT_ADDRESSES
		].includes(method)
	) {
		await listener?.rejectRequest({ topic, id, error: getSdkError('UNSUPPORTED_METHODS') });

		toastsError({
			msg: {
				text: replacePlaceholders(get(i18n).wallet_connect.error.method_not_support, {
					$method: method
				})
			}
		});

		return;
	}

	switch (method) {
		case SESSION_REQUEST_ETH_SIGN_LEGACY:
		case SESSION_REQUEST_ETH_SIGN_V4:
		case SESSION_REQUEST_ETH_SIGN:
		case SESSION_REQUEST_PERSONAL_SIGN:
		case SESSION_REQUEST_SOL_SIGN_TRANSACTION:
		case SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION:
		case SESSION_REQUEST_BTC_SIGN_MESSAGE:
		case SESSION_REQUEST_BTC_SIGN_PSBT: {
			modalStore.openWalletConnectSign({ id: Symbol(), data: sessionRequest });
			return;
		}
		case SESSION_REQUEST_BTC_GET_ACCOUNT_ADDRESSES: {
			// `getAccountAddresses` only returns already-public account data (address, public key,
			// derivation path) with no signing or spend, so it is answered directly without a modal.
			await getAccountAddresses({
				listener,
				request: sessionRequest,
				identity: get(authIdentity),
				addresses: new Map([
					[BTC_MAINNET_NETWORK_ID, get(btcAddressMainnet)],
					[BTC_TESTNET_NETWORK_ID, get(btcAddressTestnet)],
					[BTC_REGTEST_NETWORK_ID, get(btcAddressRegtest)]
				])
			});
			return;
		}
		case SESSION_REQUEST_ETH_SEND_TRANSACTION: {
			modalStore.openWalletConnectSend({ id: Symbol(), data: sessionRequest });
			return;
		}
		default: {
			await listener?.rejectRequest({ topic, id, error: getSdkError('UNSUPPORTED_METHODS') });

			toastsError({
				msg: {
					text: replacePlaceholders(get(i18n).wallet_connect.error.method_not_support, {
						$method: method
					})
				}
			});

			close();
		}
	}
};
