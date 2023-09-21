<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalBurn } from '$lib/derived/modal.derived';
	import BurnModal from '$lib/components/burn/BurnModal.svelte';
	import IconBurn from "$lib/components/icons/IconBurn.svelte";

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $isBusy;
</script>

<button class="hero" style="flex-basis: 100%;" on:click={modalStore.openBurn} {disabled} class:opacity-50={disabled}>
	<IconBurn size="28" />
	<span>Convert to native ICP</span></button
>

{#if $modalBurn}
	<BurnModal />
{/if}
