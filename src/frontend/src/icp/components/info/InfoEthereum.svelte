<script lang="ts">
	import eth from '$lib/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { modalHowToConvertETHToCkETH } from '$lib/derived/modal.derived';
	import HowToConvertETHModal from '$icp/components/convert/HowToConvertETHModal.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';

	const openReceive = () => modalStore.openHowToConvertETHToCkETH();

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh' });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<div class="pr-2">
	<h4 class="flex gap-2 items-center font-medium">
		<Logo src={eth} size="20px" alt={`Ethereum logo`} />
		<span class="w-[70%]">Receive ETH from Ethereum Network and convert to ckETH</span>
	</h4>

	<p class="text-misty-rose mt-3">
		With a few steps, transfer and convert your Ethereum (ETH) to ckETH directly within the {OISY_NAME}.
	</p>

	<button class="primary mt-6" disabled={$isBusy} class:opacity-50={$isBusy} on:click={openReceive}>
		How to convert ETH to ckETH</button
	>
</div>

{#if $modalHowToConvertETHToCkETH}
	<HowToConvertETHModal />
{/if}
