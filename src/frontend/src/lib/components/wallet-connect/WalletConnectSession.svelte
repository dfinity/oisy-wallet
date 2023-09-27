<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { onDestroy } from 'svelte';
	import { initWalletConnectListener } from '$lib/services/listener.services';
	import { addressStore } from '$lib/stores/address.store';
	import WalletConnectForm from '$lib/components/wallet-connect/WalletConnectForm.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectReview from '$lib/components/wallet-connect/WalletConnectReview.svelte';
	import { busy } from '$lib/stores/busy.store';
	import type { WalletConnectListener } from '$lib/types/wallet-connect';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		SESSION_REQUEST_SEND_TRANSACTION,
		SESSION_REQUEST_PERSONAL_SIGN,
		SESSION_REQUEST_ETH_SIGN,
		SESSION_REQUEST_ETH_SIGN_V4
	} from '$lib/constants/wallet-connect.constants';
	import { modalWalletConnect, modalWalletConnectAuth } from '$lib/derived/modal.derived';
	import WalletConnectButton from '$lib/components/wallet-connect/WalletConnectButton.svelte';
	import { getSdkError } from '@walletconnect/utils';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { walletConnectUri } from '$lib/derived/wallet-connect.derived';
	import { loading } from '$lib/stores/loader.store';

	export let listener: WalletConnectListener | undefined | null;

	const STEP_CONNECT: WizardStep = {
		name: 'Connect',
		title: 'WalletConnect'
	};

	const STEP_REVIEW: WizardStep = {
		name: 'Review',
		title: 'Session Proposal'
	};

	let steps: WizardSteps = [STEP_CONNECT, STEP_REVIEW];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => modalStore.close();
	const resetAndClose = () => {
		resetListener();
		close();
	};

	let proposal: Web3WalletTypes.SessionProposal | undefined | null;

	const disconnect = async () => {
		await disconnectListener();

		toastsShow({
			text: 'WalletConnect disconnected.',
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
					text: `An unexpected error happened while disconnecting the wallet. Resetting the connection anyway.`
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
			// Connect and disconnect buttons are disabled until the address is loaded therefore this should never happens.
			if (isNullish($addressStore)) {
				toastsError({
					msg: { text: 'Address is unknown.' }
				});
				return;
			}

			listener = await initWalletConnectListener({ uri, address: $addressStore });
		} catch (err: unknown) {
			toastsError({
				msg: { text: `An unexpected error happened while trying to connect the wallet.` },
				err
			});

			resetListener();
		}
	};

	onDestroy(async () => await disconnectListener());

	const goToFirstStep = () => modal?.set?.(0);

	// One try to manually sign-in by entering the URL manually or scanning a QR code
	const userConnect = async ({ detail: uri }: CustomEvent<string>) => {
		modal.next();

		const { result } = await connect(uri);

		if (result === 'error') {
			modal.back();
		}
	};

	// One try to sign-in using the Oisy Wallet listed in the WalletConnect app and the sign-in occurs through URL
	const uriConnect = async () => {
		if (isNullish($walletConnectUri)) {
			return;
		}

		// We are still loading ETH address and other data. Boot screen load.
		if ($loading) {
			return;
		}

		// Address is not defined. We need it.
		if (isNullish($addressStore)) {
			return;
		}

		// For simplicity reason we just display an error for now if user has already opened the WalletConnect modal.
		// Technically we could potentially check which steps is in progress and eventually jump or not but, let's keep it simple for now.
		if ($modalWalletConnectAuth) {
			toastsError({
				msg: {
					text: `Please finalize the manual workflow that has already been initiated by opening the WalletConnect modal.`
				}
			});
			return;
		}

		// No step connect here
		steps = [STEP_REVIEW];

		// We open the WalletConnect auth modal on the review step
		modalStore.openWalletConnectAuth();

		await connect($walletConnectUri);
	};

	$: $addressStore, $walletConnectUri, $loading, (async () => await uriConnect())();

	const connect = async (uri: string): Promise<{ result: 'success' | 'error' | 'critical' }> => {
		await initListener(uri);

		if (isNullish(listener)) {
			return { result: 'error' };
		}

		listener.sessionProposal((sessionProposal) => {
			// Prevent race condition
			if (isNullish(listener)) {
				return;
			}

			proposal = sessionProposal;
		});

		listener.sessionDelete(() => {
			// Prevent race condition
			if (isNullish(listener)) {
				return;
			}

			resetListener();

			toastsShow({
				text: 'WalletConnect session was ended.',
				level: 'info',
				duration: 2000
			});

			goToFirstStep();
		});

		listener.sessionRequest(async (sessionRequest: Web3WalletTypes.SessionRequest) => {
			// Prevent race condition
			if (isNullish(listener)) {
				return;
			}

			// Another modal, like Send or Receive, is already in progress
			if (nonNullish($modalStore) && !$modalWalletConnect) {
				toastsError({
					msg: {
						text: 'Skipping the WalletConnect request as another action is currently in progress through an overlay.'
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
				case SESSION_REQUEST_PERSONAL_SIGN: {
					modalStore.openWalletConnectSign(sessionRequest);
					return;
				}
				case SESSION_REQUEST_SEND_TRANSACTION: {
					modalStore.openWalletConnectSend(sessionRequest);
					return;
				}
				default: {
					await listener?.rejectRequest({ topic, id, error: getSdkError('UNSUPPORTED_METHODS') });

					toastsError({
						msg: { text: `Requested method "${method}" is not supported.` }
					});

					close();
				}
			}
		});

		try {
			await listener.pair();
		} catch (err: unknown) {
			resetListener();

			toastsError({
				msg: { text: `An unexpected error happened while trying to pair the wallet.` },
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

	const approve = async () =>
		await answer({
			callback: listener?.approveSession,
			toast: () =>
				toastsShow({
					text: 'WalletConnect connected.',
					level: 'success',
					duration: 2000
				})
		});

	const answer = async ({
		callback,
		toast
	}: {
		callback: ((proposal: Web3WalletTypes.SessionProposal) => Promise<void>) | undefined;
		toast?: () => void;
	}) => {
		if (isNullish(listener) || isNullish(callback)) {
			toastsError({
				msg: { text: `Unexpected error: No connection opened.` }
			});

			close();
			return;
		}

		if (isNullish(proposal)) {
			toastsError({
				msg: { text: `Unexpected error: No session proposal available.` }
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
				msg: { text: `Unexpected error while communicating with WalletConnect.` },
				err
			});

			resetListener();
		}

		busy.stop();

		close();
	};
</script>

{#if isNullish(listener)}
	<WalletConnectButton on:click={modalStore.openWalletConnectAuth}>Connect</WalletConnectButton>
{:else}
	<WalletConnectButton on:click={disconnect}>Disconnect</WalletConnectButton>
{/if}

{#if $modalWalletConnectAuth}
	<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={resetAndClose}>
		<WalletConnectModalTitle slot="title">
			{`${
				currentStep?.name === 'Review' && nonNullish(proposal)
					? 'Session Proposal'
					: 'WalletConnect'
			}`}
		</WalletConnectModalTitle>

		{#if currentStep?.name === 'Review'}
			<WalletConnectReview {proposal} on:icReject={reject} on:icApprove={approve} />
		{:else}
			<WalletConnectForm on:icConnect={userConnect} />
		{/if}
	</WizardModal>
{/if}
