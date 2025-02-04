<script>
	import { nonNullish } from '@dfinity/utils';
	import AirdropModal from '$lib/components/airdrops/AirdropModal.svelte';
	import AirdropsGroups from '$lib/components/airdrops/AirdropsGroups.svelte';
	import { modalAirdropDetails } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	let selectedAirdrop;
	$: selectedAirdrop = $modalStore?.data;
</script>

<AirdropsGroups title="Upcoming" airdrops={['Oisy Sprinkles', 'WUPPIU']} />

{#if $modalAirdropDetails && nonNullish(selectedAirdrop)}
	<AirdropModal airdrop={selectedAirdrop} />
{/if}
