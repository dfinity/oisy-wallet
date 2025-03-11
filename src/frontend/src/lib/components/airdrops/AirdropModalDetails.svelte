<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import AirdropModal from '$lib/components/airdrops/AirdropModal.svelte';
	import { modalAirdropDetails } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	let selectedAirdrop: AirdropDescription | undefined = undefined;
	$: selectedAirdrop = $modalAirdropDetails
		? ($modalStore?.data as AirdropDescription | undefined)
		: undefined;
</script>

{#if nonNullish(selectedAirdrop)}
	<AirdropModal airdrop={selectedAirdrop} />
{/if}
