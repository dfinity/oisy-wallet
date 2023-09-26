<script lang="ts">
	import { modalAirdrop } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal } from '@dfinity/gix-components';
	import type { Info } from '$declarations/airdrop/airdrop.did';
	import { AIRDROP_COMPLETED } from '$lib/constants/airdrop.constants';
	import AirdropOngoing from '$lib/components/airdrop/AirdropOngoing.svelte';
	import AirdropOver from "$lib/components/airdrop/AirdropCompleted.svelte";

	export let airdrop: Info;
</script>

<Modal visible={$modalAirdrop} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">AirDrop status</svelte:fragment>

	{#if AIRDROP_COMPLETED}
		<AirdropOver {airdrop} />
	{:else}
		<AirdropOngoing {airdrop} />
	{/if}
</Modal>
