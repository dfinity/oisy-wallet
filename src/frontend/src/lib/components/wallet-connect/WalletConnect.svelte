<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { WebSocketListener } from '$lib/types/listener';
	import { onDestroy } from 'svelte';
	import { initWalletConnectListener } from '$lib/services/listener.services';
	import { addressStore } from '$lib/stores/address.store';
	import WalletConnectForm from '$lib/components/wallet-connect/WalletConnectForm.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectReview from '$lib/components/wallet-connect/WalletConnectReview.svelte';

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
	let listener: WebSocketListener | undefined | null;

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
</script>

<button on:click={() => (visible = true)} class="secondary text-deep-violet mt-2">
	WalletConnect
</button>

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
			<WalletConnectReview {proposal} />
		{:else}
			<WalletConnectForm on:icConnect={connect} />
		{/if}
	</WizardModal>
{/if}
