<script lang="ts">
	import IconCelebrate from '$lib/components/icons/IconCelebrate.svelte';
	import { fade } from 'svelte/transition';
	import { modalStore } from '$lib/stores/modal.store';
	import AirdropModal from '$lib/components/airdrop/AirdropModal.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { airdropStore } from '$lib/stores/airdrop.store';
</script>

<button class="airdrop full center mt-3" in:fade on:click={modalStore.openAirdrop}
	><IconCelebrate /> AirDrop status <span class="text-blue">Check</span></button
>

{#if nonNullish($airdropStore)}
	<AirdropModal airdrop={$airdropStore} />
{/if}
