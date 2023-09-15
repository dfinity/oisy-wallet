<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { balanceEmpty } from '$lib/derived/balances.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$lib/components/send/SendModal.svelte';

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $balanceEmpty || $isBusy;
</script>

<button
	class="flex-1 hero"
	on:click={modalStore.openSend}
	{disabled}
	class:opacity-0={disabled}
>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalSend}
	<SendModal />
{/if}
