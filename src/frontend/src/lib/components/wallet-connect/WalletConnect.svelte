<script lang="ts">
	import { Spinner, WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { WebSocketListener } from '$lib/types/listener';
	import { onDestroy } from 'svelte';
	import { initWalletConnectListener } from '$lib/services/listener.services';
	import { addressStore } from '$lib/stores/address.store';
	import WalletConnectForm from '$lib/components/wallet-connect/WalletConnectForm.svelte';
	import { isNullish } from '@dfinity/utils';

	const steps: WizardSteps = [
		{
			name: 'Connect',
			title: 'Connect'
		},
		{
			name: 'Loading',
			title: 'Loading'
		},
		{
			name: 'Review',
			title: 'Review'
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let visible = false;

	const close = () => (visible = false);

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async (uri: string) => {
		await listener?.disconnect();

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

	onDestroy(async () => await listener?.disconnect());

	const connect = async ({ detail: uri }: CustomEvent<string>) => {
		modal.next();

		await initListener(uri);

		if (isNullish(listener)) {
			modal.back();
			return;
		}

		listener.sessionProposal((proposal) => {
			modal.next();

			// TODO:
			console.log(proposal);
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
		<svelte:fragment slot="title">WalletConnect</svelte:fragment>

		{#if currentStep?.name === 'Review'}
			Approve or decline
		{:else if currentStep?.name === 'Loading'}
			<div class="flex flex-col items-center justify-center">
				<div>
					<Spinner inline />
				</div>
				<p>Connecting...</p>
			</div>
		{:else}
			<WalletConnectForm on:icConnect={connect} />
		{/if}
	</WizardModal>
{/if}
