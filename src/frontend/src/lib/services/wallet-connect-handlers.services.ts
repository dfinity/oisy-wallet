import {
	SESSION_REQUEST_ETH_SEND_TRANSACTION,
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_LEGACY,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import { modalWalletConnect } from '$lib/derived/modal.derived';
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
	if (nonNullish(get(modalStore)) && !get(modalWalletConnect)) {
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

	switch (method) {
		case SESSION_REQUEST_ETH_SIGN_LEGACY:
		case SESSION_REQUEST_ETH_SIGN_V4:
		case SESSION_REQUEST_ETH_SIGN:
		case SESSION_REQUEST_PERSONAL_SIGN:
		case SESSION_REQUEST_SOL_SIGN_TRANSACTION:
		case SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION: {
			modalStore.openWalletConnectSign({ id: Symbol(), data: sessionRequest });
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
