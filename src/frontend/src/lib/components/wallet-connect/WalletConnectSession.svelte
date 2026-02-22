<script lang="ts">
	import type { WizardModal, WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onDestroy, untrack } from 'svelte';
	import { walletConnectUri } from '$eth/derived/wallet-connect.derived';
	import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
	import WalletConnectButton from '$lib/components/wallet-connect/WalletConnectButton.svelte';
	import WalletConnectSessionModal from '$lib/components/wallet-connect/WalletConnectSessionModal.svelte';
	import {
		walletConnectReviewWizardSteps,
		walletConnectWizardSteps
	} from '$lib/config/wallet-connect.config';
	import { TRACK_COUNT_WALLET_CONNECT_MENU_OPEN } from '$lib/constants/analytics.constants';
	import { ethAddress, solAddressDevnet, solAddressMainnet } from '$lib/derived/address.derived';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { modalWalletConnectAuth } from '$lib/derived/modal.derived';
	import type { WizardStepsWalletConnect } from '$lib/enums/wizard-steps';
	import { WalletConnectClient } from '$lib/providers/wallet-connect.providers';
	import { trackEvent } from '$lib/services/analytics.services';
	import {
		onSessionDelete,
		onSessionProposal,
		onSessionRequest
	} from '$lib/services/wallet-connect-handlers.services';
	import {
		connectListener,
		disconnectListener,
		resetListener
	} from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { initialLoading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { walletConnectListenerStore as listenerStore } from '$lib/stores/wallet-connect.store';

	let listener = $derived($listenerStore);

	const modalId = Symbol();

	let onlyReview = $state(false);

	let steps = $derived<WizardSteps<WizardStepsWalletConnect>>(
		onlyReview
			? walletConnectReviewWizardSteps({ i18n: $i18n })
			: walletConnectWizardSteps({ i18n: $i18n })
	);

	let modal = $state<WizardModal<WizardStepsWalletConnect>>();

	const disconnect = async () => {
		await disconnectListener();

		toastsShow({
			text: $i18n.wallet_connect.info.disconnected,
			level: 'info',
			duration: 2000
		});
	};

	$effect(() => {
		if ($authNotSignedIn) {
			untrack(() => disconnectListener());
		}
	});

	const goToFirstStep = () => modal?.set?.(0);

	// One try to sign in using the Oisy Wallet listed in the WalletConnect app, and the sign-in occurs through URL
	const uriConnect = async () => {
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

		// For simplicity reason, we just display an error for now if the user has already opened the WalletConnect modal.
		// Technically, we could potentially check which steps are in progress and eventually jump or not, but let's keep it simple for now.
		if ($modalWalletConnectAuth) {
			toastsError({
				msg: {
					text: $i18n.wallet_connect.error.manual_workflow
				}
			});
			return;
		}

		// No step connect here
		onlyReview = true;

		// We open the WalletConnect auth modal on the review step
		modalStore.openWalletConnectAuth(modalId);

		await connectListener({ uri: $walletConnectUri, onSessionDeleteCallback: goToFirstStep });
	};

	$effect(() => {
		[$ethAddress, $solAddressMainnet, $walletConnectUri, $initialLoading];

		untrack(() => uriConnect());
	});

	$effect(() => {
		walletConnectPaired.set(nonNullish(listener));
	});

	let reconnecting = $state(true);

	const reconnect = async () => {
		reconnecting = true;

		// If the listener is already initialised, we don't need to do anything.
		if (nonNullish(listener)) {
			reconnecting = false;

			return;
		}

		if ($initialLoading || (isNullish($ethAddress) && isNullish($solAddressMainnet))) {
			reconnecting = false;

			return;
		}

		// Create listener, but DO NOT pair()
		try {
			const newListener = await WalletConnectClient.init({
				ethAddress: $ethAddress,
				solAddressMainnet: $solAddressMainnet,
				solAddressDevnet: $solAddressDevnet,
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
							resetListener();

							goToFirstStep();
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
			}
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.connect },
				err
			});

			resetListener();
		} finally {
			reconnecting = false;
		}
	};

	$effect(() => {
		[$ethAddress, $solAddressMainnet, $initialLoading];

		untrack(() => reconnect());
	});

	onDestroy(() => walletConnectPaired.set(false));

	const openWalletConnectAuth = () => {
		modalStore.openWalletConnectAuth(modalId);

		trackEvent({
			name: TRACK_COUNT_WALLET_CONNECT_MENU_OPEN
		});
	};
</script>

<svelte:window onoisyDisconnectWalletConnect={disconnectListener} />

{#if nonNullish(listener)}
	<WalletConnectButton onclick={disconnect}>
		{$i18n.wallet_connect.text.disconnect}
	</WalletConnectButton>
{:else}
	<WalletConnectButton
		ariaLabel={$i18n.wallet_connect.text.name}
		loading={reconnecting}
		onclick={openWalletConnectAuth}
	/>
{/if}

{#if $modalWalletConnectAuth}
	<WalletConnectSessionModal {steps} bind:modal />
{/if}
