<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalBurn } from '$lib/derived/modal.derived';
	import BurnModal from '$lib/components/burn/BurnModal.svelte';

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $isBusy;
</script>

<button class="flex-1 hero" on:click={modalStore.openBurn} {disabled} class:opacity-50={disabled}>
	<IconSend size="28" />
	<span>Burn</span></button
>

{#if $modalBurn}
	<BurnModal />
{/if}
