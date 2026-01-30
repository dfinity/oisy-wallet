<script lang="ts">
	import type { WizardModal, WizardStep, WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { getSdkError } from '@walletconnect/utils';
	import { onDestroy, untrack } from 'svelte';
	import {
		SESSION_REQUEST_ETH_SEND_TRANSACTION,
		SESSION_REQUEST_ETH_SIGN,
		SESSION_REQUEST_ETH_SIGN_LEGACY,
		SESSION_REQUEST_ETH_SIGN_V4,
		SESSION_REQUEST_PERSONAL_SIGN
	} from '$eth/constants/wallet-connect.constants';
	import { walletConnectUri } from '$eth/derived/wallet-connect.derived';
	import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
	import WalletConnectButton from '$lib/components/wallet-connect/WalletConnectButton.svelte';
	import WalletConnectSessionModal from '$lib/components/wallet-connect/WalletConnectSessionModal.svelte';
	import { TRACK_COUNT_WALLET_CONNECT_MENU_OPEN } from '$lib/constants/analytics.constants';
	import { ethAddress, solAddressDevnet, solAddressMainnet } from '$lib/derived/address.derived';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { modalWalletConnect, modalWalletConnectAuth } from '$lib/derived/modal.derived';
	import { WizardStepsWalletConnect } from '$lib/enums/wizard-steps';
	import { initWalletConnect } from '$lib/providers/wallet-connect.providers';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { initialLoading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import {
		walletConnectListenerStore as listenerStore,
		walletConnectProposalStore as proposalStore
	} from '$lib/stores/wallet-connect.store';
	import type {
		OptionWalletConnectListener,
		WalletConnectListener
	} from '$lib/types/wallet-connect';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
		SESSION_REQUEST_SOL_SIGN_TRANSACTION
	} from '$sol/constants/wallet-connect.constants';

	let listener = $derived($listenerStore);

	const modalId = Symbol();

	const signModalId = Symbol();
	const sendModalId = Symbol();

	const STEP_CONNECT: WizardStep<WizardStepsWalletConnect> = {
		name: WizardStepsWalletConnect.CONNECT,
		title: $i18n.wallet_connect.text.name
	};

	const STEP_REVIEW: WizardStep<WizardStepsWalletConnect> = {
		name: WizardStepsWalletConnect.REVIEW,
		title: $i18n.wallet_connect.text.session_proposal
	};

	let steps = $state<WizardSteps<WizardStepsWalletConnect>>([STEP_CONNECT, STEP_REVIEW]);

	let modal = $state<WizardModal<WizardStepsWalletConnect>>();

	const close = () => modalStore.close();
	const resetAndClose = () => {
		resetListener();
		close();
	};

	const disconnect = async () => {
		await disconnectListener();

		toastsShow({
			text: $i18n.wallet_connect.info.disconnected,
			level: 'info',
			duration: 2000
		});
	};

	const disconnectListener = async () => {
		try {
			if (isNullish(listener)) {
				return;
			}

			detachHandlers(listener);

			await listener.disconnect();
		} catch (err: unknown) {
			toastsError({
				msg: {
					text: $i18n.wallet_connect.error.disconnect
				},
				err
			});
		}

		resetListener();
	};

	const resetListener = () => {
		listenerStore.reset();
	};

	const initListener = async (): Promise<OptionWalletConnectListener> => {
		await disconnectListener();

		try {
			// Connect and disconnect buttons are disabled until at least one of the address is loaded; therefore, this should never happen.
			if (isNullish($ethAddress) && isNullish($solAddressMainnet)) {
				toastsError({
					msg: { text: $i18n.send.assertion.address_unknown }
				});
				return;
			}

			const newListener = await initWalletConnect({
				ethAddress: $ethAddress,
				solAddressMainnet: $solAddressMainnet,
				solAddressDevnet: $solAddressDevnet
			});

			listenerStore.set(newListener);

			return newListener;
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.connect },
				err
			});

			resetListener();
		}
	};

	$effect(() => {
		if ($authNotSignedIn) {
			untrack(() => disconnectListener());
		}
	});

	const goToFirstStep = () => modal?.set?.(0);

	// One try to manually sign in by entering the URL manually or scanning a QR code
	const userConnect = async (uri: string) => {
		if (isNullish(modal)) {
			return;
		}

		modal.next();

		const { result } = await connect(uri);

		if (result === 'error') {
			modal.back();
		}
	};

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
		steps = [STEP_REVIEW];

		// We open the WalletConnect auth modal on the review step
		modalStore.openWalletConnectAuth(modalId);

		await connect($walletConnectUri);
	};

	$effect(() => {
		[$ethAddress, $solAddressMainnet, $walletConnectUri, $initialLoading];

		untrack(() => uriConnect());
	});

	const onSessionProposal = (sessionProposal: WalletKitTypes.SessionProposal) => {
		proposalStore.set(sessionProposal);
	};

	const onSessionDelete = () => {
		// Prevent race condition
		if (isNullish(listener)) {
			return;
		}

		resetListener();

		toastsShow({
			text: $i18n.wallet_connect.info.session_ended,
			level: 'info',
			duration: 2000
		});

		goToFirstStep();
	};

	const onSessionRequest = async (sessionRequest: WalletKitTypes.SessionRequest) => {
		// Prevent race condition
		if (isNullish(listener)) {
			return;
		}

		// Another modal, like Send or Receive, is already in progress
		if (nonNullish($modalStore) && !$modalWalletConnect) {
			toastsError({
				msg: {
					text: $i18n.wallet_connect.error.skipping_request
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
				modalStore.openWalletConnectSign({ id: signModalId, data: sessionRequest });
				return;
			}
			case SESSION_REQUEST_ETH_SEND_TRANSACTION: {
				modalStore.openWalletConnectSend({ id: sendModalId, data: sessionRequest });
				return;
			}
			default: {
				await listener?.rejectRequest({ topic, id, error: getSdkError('UNSUPPORTED_METHODS') });

				toastsError({
					msg: {
						text: replacePlaceholders($i18n.wallet_connect.error.method_not_support, {
							$method: method
						})
					}
				});

				close();
			}
		}
	};

	const attached = new WeakSet<WalletConnectListener>();

	const attachHandlers = (listener: WalletConnectListener) => {
		if (attached.has(listener)) {
			return;
		}

		attached.add(listener);

		listener.sessionProposal(onSessionProposal);

		listener.sessionDelete(onSessionDelete);

		listener.sessionRequest(onSessionRequest);
	};

	const detachHandlers = (listener: WalletConnectListener) => {
		if (!attached.has(listener)) {
			return;
		}

		attached.delete(listener);

		listener.offSessionProposal(onSessionProposal);

		listener.offSessionDelete(onSessionDelete);

		listener.offSessionRequest(onSessionRequest);
	};

	const connect = async (uri: string): Promise<{ result: 'success' | 'error' | 'critical' }> => {
		const newListener = await initListener();

		if (isNullish(newListener)) {
			return { result: 'error' };
		}

		attachHandlers(newListener);

		try {
			await newListener.pair(uri);
		} catch (err: unknown) {
			resetListener();

			toastsError({
				msg: { text: $i18n.wallet_connect.error.unexpected_pair },
				err
			});

			close();

			return { result: 'critical' };
		}

		return { result: 'success' };
	};

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
			const newListener = await initWalletConnect({
				ethAddress: $ethAddress,
				solAddressMainnet: $solAddressMainnet,
				solAddressDevnet: $solAddressDevnet,
				cleanSlate: false
			});

			listenerStore.set(newListener);

			// Reattach handlers so incoming requests work after refresh
			attachHandlers(newListener);

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
	<WalletConnectSessionModal onClose={resetAndClose} onConnect={userConnect} {steps} bind:modal />
{/if}
