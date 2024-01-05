<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcSend, modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import IcSendModal from '$lib/components/send/ic/IcSendModal.svelte';
	import { networkICP } from '$lib/derived/network.derived';

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $isBusy;

	const onClick = () => {
		if ($networkICP) {
			modalStore.openIcSend();
			return;
		}

		modalStore.openSend();
	};
</script>

<button class="flex-1 hero" on:click={onClick} {disabled} class:opacity-50={disabled}>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalSend}
	<SendModal />
{:else if $modalIcSend}
	<IcSendModal />
{/if}
