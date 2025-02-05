<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import AirdropStateModal from '$lib/components/airdrops/AirdropStateModal.svelte';
	import { modalAirdropState } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { getAirdrops } from '$lib/services/reward-code.services';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { RewardInfo } from '$declarations/rewards/rewards.did';

	onMount(async () => {
		const initialLoading = sessionStorage.getItem('initialLoading');
		if (isNullish(initialLoading)) {
			const airdrops: RewardInfo[] = await getAirdrops({identity: $authIdentity});
			if (airdrops.length > 0) {
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
