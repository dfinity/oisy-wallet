<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onDestroy, untrack } from 'svelte';
	import { page } from '$app/state';
	import { walletConnectUri } from '$eth/derived/wallet-connect.derived';
	import { walletConnectPaired, walletConnectReconnecting } from '$eth/stores/wallet-connect.store';
	import { URI_PARAM } from '$lib/constants/routes.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet,
		ethAddress,
		solAddressDevnet,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity, authNotSignedIn } from '$lib/derived/auth.derived';
	import { modalUniversalScannerOpen } from '$lib/derived/modal.derived';
	import { WalletConnectClient } from '$lib/providers/wallet-connect.providers';
	import {
		onSessionDelete,
		onSessionProposal,
		onSessionRequest
	} from '$lib/services/wallet-connect-handlers.services';
	import {
		disconnectListener,
		resetListener,
		resetListenerIfNoSessions,
		syncSessions
	} from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { initialLoading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { walletConnectListenerStore as listenerStore } from '$lib/stores/wallet-connect.store';
	import { removeSearchParam } from '$lib/utils/nav.utils';

	let listener = $derived($listenerStore);

	const modalId = Symbol();

	$effect(() => {
		if ($authNotSignedIn) {
			untrack(() => disconnectListener());
		}
	});

	// One try to sign in using the Oisy Wallet listed in the WalletConnect app, and the sign-in occurs through URL
	const uriConnect = () => {
		if (isNullish($walletConnectUri)) {
			return;
		}

		// We are still loading ETH address and other data. Boot screen load.
		if ($initialLoading) {
			return;
		}

		// Address is not defined. We need at least one between the Ethereum address and the Solana address.
		if (isNullish($ethAddress) && isNullish($solAddressMainnet)) {
			return;
		}

		// For simplicity reason, we just display an error for now if the user has already opened the scanner modal.
		if ($modalUniversalScannerOpen) {
			toastsError({
				msg: {
					text: $i18n.wallet_connect.error.manual_workflow
				}
			});
			return;
		}

		// Open the universal scanner modal with the WC URI — ScannerModal will navigate to the WC review step
		modalStore.openUniversalScanner({
			id: modalId,
			data: { walletConnectUri: $walletConnectUri }
		});

		// Remove the URI query parameter after capturing it in the store
		// to prevent stale URIs from forcing a cleanSlate reconnect on refresh,
		// which would otherwise wipe persisted WalletConnect sessions.
		removeSearchParam({ url: page.url, searchParam: URI_PARAM });
	};

	$effect(() => {
		[$ethAddress, $solAddressMainnet, $walletConnectUri, $initialLoading];

		untrack(() => uriConnect());
	});

	$effect(() => {
		walletConnectPaired.set(nonNullish(listener));
	});

	const reconnect = async () => {
		walletConnectReconnecting.set(true);

		// If the listener is already initialised, we don't need to do anything.
		if (nonNullish(listener)) {
			walletConnectReconnecting.set(false);

			return;
		}

		// When a WalletConnect URI is present (deep link), uriConnect() handles the connection.
		// Running reconnect() concurrently would race and potentially disconnect the session.
		if (nonNullish($walletConnectUri)) {
			walletConnectReconnecting.set(false);

			return;
		}

		if ($initialLoading || (isNullish($ethAddress) && isNullish($solAddressMainnet))) {
			walletConnectReconnecting.set(false);

			return;
		}

		// Create listener, but DO NOT pair()
		try {
			const newListener = await WalletConnectClient.init({
				ethAddress: $ethAddress,
				solAddressMainnet: $solAddressMainnet,
				solAddressDevnet: $solAddressDevnet,
				btcAddressMainnet: $btcAddressMainnet,
				btcAddressTestnet: $btcAddressTestnet,
				btcAddressRegtest: $btcAddressRegtest,
				btcPrincipal: $authIdentity?.getPrincipal(),
				cleanSlate: false
			});

			listenerStore.set(newListener);

			// Reattach handlers so incoming requests work after refresh
			newListener.attachHandlers({
				onSessionProposal,
				onSessionDelete: () =>
					onSessionDelete({
						listener: newListener,
						callback: () => {
							// Only one session ended — keep the listener alive if other dApps remain connected.
							resetListenerIfNoSessions();
						}
					}),
				onSessionRequest: (sessionRequest: WalletKitTypes.SessionRequest) =>
					onSessionRequest({ listener: newListener, sessionRequest })
			});

			// Check for persisted sessions
			const sessions = newListener.getActiveSessions();

			// We have no active sessions, we can disconnect the listener.
			if (Object.keys(sessions).length === 0) {
				await disconnectListener();
			} else {
				// Seed the reactive sessions store with the restored sessions.
				syncSessions();
			}
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.connect },
				err
			});

			resetListener();
		} finally {
			walletConnectReconnecting.set(false);
		}
	};

	$effect(() => {
		[$ethAddress, $solAddressMainnet, $initialLoading];

		untrack(() => reconnect());
	});

	onDestroy(() => {
		walletConnectPaired.set(false);
		walletConnectReconnecting.set(false);
	});
</script>

<svelte:window onoisyDisconnectWalletConnect={disconnectListener} />
