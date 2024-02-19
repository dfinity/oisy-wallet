<script lang="ts">
	import IconCelebrate from '$airdrop/components/icons/IconCelebrate.svelte';
	import { slide } from 'svelte/transition';
	import { modalStore } from '$lib/stores/modal.store';
	import AirdropModal from '$airdrop/components/airdrop/AirdropModal.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { airdropStore } from '$airdrop/stores/airdrop.store';
	import { quintOut } from 'svelte/easing';
</script>

<button
	class="airdrop full center mb-12"
	in:slide={{ delay: 0, duration: 500, easing: quintOut, axis: 'y' }}
	on:click={modalStore.openAirdrop}
	><IconCelebrate /> AirDrop status <span class="text-blue">Check</span></button
>

{#if nonNullish($airdropStore)}
	<AirdropModal airdrop={$airdropStore} />
{/if}
