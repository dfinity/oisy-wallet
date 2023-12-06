<script lang="ts">
	import IconCelebrate from '$lib/components/icons/IconCelebrate.svelte';
	import { slide } from 'svelte/transition';
	import { modalStore } from '$lib/stores/modal.store';
	import AirdropModal from '$lib/components/airdrop/AirdropModal.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { airdropStore } from '$lib/stores/airdrop.store';
	import { quintOut } from 'svelte/easing';
</script>

<button
	class="airdrop full center mt-6"
	transition:slide={{ delay: 150, duration: 500, easing: quintOut, axis: 'y' }}
	on:click={modalStore.openAirdrop}
	><IconCelebrate /> AirDrop status <span class="text-blue">Check</span></button
>

{#if nonNullish($airdropStore)}
	<AirdropModal airdrop={$airdropStore} />
{/if}
