<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { getSdkError } from '@walletconnect/utils';
	import { onDestroy } from 'svelte';
	import {
		SESSION_REQUEST_ETH_SEND_TRANSACTION,
		SESSION_REQUEST_ETH_SIGN,
		SESSION_REQUEST_ETH_SIGN_V4,
		SESSION_REQUEST_PERSONAL_SIGN
	} from '$eth/constants/wallet-connect.constants';
	import { walletConnectUri } from '$eth/derived/wallet-connect.derived';
	import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
	import WalletConnectButton from '$lib/components/wallet-connect/WalletConnectButton.svelte';
	import WalletConnectForm from '$lib/components/wallet-connect/WalletConnectForm.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import WalletConnectReview from '$lib/components/wallet-connect/WalletConnectReview.svelte';
	import { TRACK_COUNT_WALLET_CONNECT_MENU_OPEN } from '$lib/constants/analytics.contants';
	import { ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { modalWalletConnect, modalWalletConnectAuth } from '$lib/derived/modal.derived';
	import { WizardStepsWalletConnect } from '$lib/enums/wizard-steps';
	import { initWalletConnect } from '$lib/providers/wallet-connect.providers';
	import { trackEvent } from '$lib/services/analytics.services';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { loading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { Option } from '$lib/types/utils';
	import type {
		OptionWalletConnectListener,
		WalletConnectListener
	} from '$lib/types/wallet-connect';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
		SESSION_REQUEST_SOL_SIGN_TRANSACTION
	} from '$sol/constants/wallet-connect.constants';

	export let listener: OptionWalletConnectListener;

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

	let steps: WizardSteps<WizardStepsWalletConnect> = [STEP_CONNECT, STEP_REVIEW];

	let currentStep: WizardStep<WizardStepsWalletConnect> | undefined;
	let modal: WizardModal<WizardStepsWalletConnect>;

	const close = () => modalStore.close();
	const resetAndClose = () => {
		resetListener();
		close();
	};

	let proposal: Option<WalletKitTypes.SessionProposal>;

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
			await listener?.disconnect();
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
		listener = undefined;
		proposal = null;
	};

	const initListener = async (uri: string) => {
		await disconnectListener();

		try {
			// Connect and disconnect buttons are disabled until the address is loaded; therefore, this should never happen.
			if (isNullish($ethAddress) || isNullish($solAddressMainnet)) {
				toastsError({
					msg: { text: $i18n.send.assertion.address_unknown }
				});
				return;
			}

			// TODO add other networks for solana
			listener = await initWalletConnect({
				uri,
				ethAddress: $ethAddress,
				solAddress: $solAddressMainnet
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.connect },
				err
			});

			resetListener();
		}
	};

	onDestroy(async () => await disconnectListener());

	const goToFirstStep = () => modal?.set?.(0);

	// One try to manually sign in by entering the URL manually or scanning a QR code
	const userConnect = async ({ detail: uri }: CustomEvent<string>) => {
		modal.next();

		const { result } = await connect(uri);

		if (result === 'error') {
			modal.back();
		}
	};

	// One try to sign in using the Oisy Wallet listed in the WalletConnect app and the sign-in occurs through URL
	const uriConnect = async () => {
		if (isNullish($walletConnectUri)) {
			return;
		}

		// We are still loading ETH address and other data. Boot screen load.
		if ($loading) {
			return;
		}

		// Address is not defined. We need it at least one between Ethereum address and Solana address.
		if (isNullish($ethAddress) && isNullish($solAddressMainnet)) {
			return;
		}

		// For simplicity reason we just display an error for now if the user has already opened the WalletConnect modal.
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

	$: ($ethAddress,
		$solAddressMainnet,
		$walletConnectUri,
		$loading,
		(async () => await uriConnect())());

	const onSessionProposal = (sessionProposal: WalletKitTypes.SessionProposal) => {
		// Prevent race condition
		if (isNullish(listener)) {
			return;
		}

		proposal = sessionProposal;
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

	const attachHandlers = (listener: WalletConnectListener) => {
		listener.sessionProposal(onSessionProposal);

		listener.sessionDelete(onSessionDelete);

		listener.sessionRequest(onSessionRequest);
	};

	const connect = async (uri: string): Promise<{ result: 'success' | 'error' | 'critical' }> => {
		await initListener(uri);

		if (isNullish(listener)) {
			return { result: 'error' };
		}

		attachHandlers(listener);

		try {
			await listener.pair();
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

	const reject = async () =>
		await answer({
			callback: async () => {
				if (nonNullish(proposal)) {
					await listener?.rejectSession(proposal);
				}

				resetAndClose();
			}
		});

	const cancel = () => {
		resetListener();
		modal.back();
	};

	const approve = async () =>
		await answer({
			callback: listener?.approveSession,
			toast: () =>
				toastsShow({
					text: $i18n.wallet_connect.info.connected,
					level: 'success',
					duration: 2000
				})
		});

	const answer = async ({
		callback,
		toast
	}: {
		callback: ((proposal: WalletKitTypes.SessionProposal) => Promise<void>) | undefined;
		toast?: () => void;
	}) => {
		if (isNullish(listener) || isNullish(callback)) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.no_connection_opened }
			});

			close();
			return;
		}

		if (isNullish(proposal)) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.no_session_approval }
			});

			close();
			return;
		}

		busy.start();

		try {
			await callback(proposal);

			toast?.();
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.unexpected },
				err
			});

			resetListener();
		}

		busy.stop();

		close();
	};

	$: walletConnectPaired.set(nonNullish(listener));

	const reconnect = async () => {
		// If the listener is already initialized, we don't need to do anything.
		if (nonNullish(listener)) {
			return;
		}

		if ($loading || isNullish($ethAddress) || isNullish($solAddressMainnet)) {
			return;
		}

		// Create listener, but DO NOT pair()
		try {
			listener = await initWalletConnect({
				uri: '', // no URI – just init client
				ethAddress: $ethAddress,
				solAddress: $solAddressMainnet,
				cleanSlate: false
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.connect },
				err
			});

			resetListener();

			return;
		}

		// Reattach handlers so incoming requests work after refresh
		attachHandlers(listener);

		// Check for persisted sessions
		const sessions = listener.getActiveSessions();

		if (Object.keys(sessions).length === 0) {
			walletConnectPaired.set(false);

			await disconnectListener();

			return;
		}

		// We have at least one active session – consider ourselves connected
		walletConnectPaired.set(true);
	};

	$: ($ethAddress, $solAddressMainnet, $loading, (async () => await reconnect())());

	onDestroy(() => walletConnectPaired.set(false));

	const openWalletConnectAuth = () => {
		modalStore.openWalletConnectAuth(modalId);

		trackEvent({
			name: TRACK_COUNT_WALLET_CONNECT_MENU_OPEN
		});
	};
</script>

{#if nonNullish(listener)}
	<WalletConnectButton on:click={disconnect}>
		{$i18n.wallet_connect.text.disconnect}
	</WalletConnectButton>
{:else}
	<WalletConnectButton
		ariaLabel={$i18n.wallet_connect.text.name}
		on:click={openWalletConnectAuth}
	/>
{/if}

{#if $modalWalletConnectAuth}
	<WizardModal bind:this={modal} onClose={resetAndClose} {steps} bind:currentStep>
		{#snippet title()}
			<WalletConnectModalTitle>
				{`${
					currentStep?.name === 'Review' && nonNullish(proposal)
						? $i18n.wallet_connect.text.session_proposal
						: $i18n.wallet_connect.text.name
				}`}
			</WalletConnectModalTitle>
		{/snippet}

		{#if currentStep?.name === 'Review'}
			<WalletConnectReview onApprove={approve} onCancel={cancel} onReject={reject} {proposal} />
		{:else}
			<WalletConnectForm on:icConnect={userConnect} />
		{/if}
	</WizardModal>
{/if}
