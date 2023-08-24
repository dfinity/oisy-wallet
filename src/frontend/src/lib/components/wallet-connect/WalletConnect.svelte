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

	let visible = false;

	const close = () => (visible = false);

	let proposal: Web3WalletTypes.SessionProposal | undefined | null;
	let listener: WalletConnectListener | undefined | null;

	const resetListener = async () => {
		await listener?.disconnect();
		listener = undefined;
		proposal = null;
	};

	const initListener = async (uri: string) => {
		await resetListener();

		try {
			// TODO: component should not be enabled unless address is loaded
			listener = await initWalletConnectListener({ uri, address: $addressStore! });
		} catch (err: unknown) {
			toastsError({
				msg: { text: `An unexpected error happened while trying to connect the wallet.` },
				err
			});
		}
	};

	onDestroy(async () => await resetListener());

	const connect = async ({ detail: uri }: CustomEvent<string>) => {
		modal.next();

		await initListener(uri);

		if (isNullish(listener)) {
			modal.back();
			return;
		}

		listener.sessionProposal((sessionProposal) => {
			proposal = sessionProposal;
		});

		try {
			await listener.pair();
		} catch (err: unknown) {
			toastsError({
				msg: { text: `An unexpected error happened while trying to pair the wallet.` },
				err
			});

			close();
		}
	};

	const reject = async () => await answer({ callback: listener?.reject });
	const approve = async () =>
		await answer({
			callback: listener?.approve,
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
		callback: (proposal: Web3WalletTypes.SessionProposal) => Promise<void>;
		toast?: () => void;
	}) => {
		if (isNullish(listener)) {
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

<button on:click={() => (visible = true)} class="primary"> WalletConnect </button>

{#if visible}
	<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
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
