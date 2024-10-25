<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import DappModal from '$lib/components/dapps/DappModal.svelte';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OisyDappDescription } from '$lib/types/oisyDappDescription';

	let selectedDapp: OisyDappDescription | undefined = undefined;
	$: selectedDapp = $modalDAppDetails
		? ($modalStore?.data as OisyDappDescription | undefined)
		: undefined;
</script>

{#if nonNullish(selectedDapp)}
	<DappModal dAppDescription={selectedDapp} />
{/if}
