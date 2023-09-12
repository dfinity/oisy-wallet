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
	import ButtonWalletConnect from '$lib/components/ui/ButtonWalletConnect.svelte';
	import { getSdkError } from '@walletconnect/utils';

	export let listener: WalletConnectListener | undefined | null;

	const steps: WizardSteps = [
		{
			name: 'Connect',
			title: 'WalletConnect'
		},
		{
			name: 'Review',
			title: 'Session Proposal'
		}
	];

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
			// TODO: component should not be enabled unless address is loaded
			listener = await initWalletConnectListener({ uri, address: $addressStore! });
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

	const connect = async ({ detail: uri }: CustomEvent<string>) => {
		modal.next();

		await initListener(uri);

		if (isNullish(listener)) {
			modal.back();
			return;
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
		}
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
		}

		busy.stop();

		close();
	};
</script>

{#if isNullish(listener)}
	<ButtonWalletConnect on:click={modalStore.openWalletConnectAuth}>Connect</ButtonWalletConnect>
{:else}
	<ButtonWalletConnect on:click={disconnect}>Disconnect</ButtonWalletConnect>
{/if}

{#if $modalWalletConnectAuth}
	<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={resetAndClose}>
		<svelte:fragment slot="title">
			{`${
				currentStep?.name === 'Review' && nonNullish(proposal)
					? 'Session Proposal'
					: 'WalletConnect'
			}`}
		</svelte:fragment>

		{#if currentStep?.name === 'Review'}
			<WalletConnectReview {proposal} on:icReject={reject} on:icApprove={approve} />
		{:else}
			<WalletConnectForm on:icConnect={connect} />
		{/if}
	</WizardModal>
{/if}
