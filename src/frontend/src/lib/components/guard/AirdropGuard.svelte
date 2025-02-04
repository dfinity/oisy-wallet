<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import AirdropStateModal from '$lib/components/airdrops/AirdropStateModal.svelte';
	import { modalAirdropState } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	onMount(() => {
		const initialLoading = sessionStorage.getItem('initialLoading');
		if (isNullish(initialLoading)) {
			// TODO check if airdrops received
			if (true) {
				modalStore.openAirdropState();
			}
			sessionStorage.setItem('initialLoading', true);
		}
	});
</script>

<slot />

{#if $modalAirdropState}
	<AirdropStateModal />
{/if}
