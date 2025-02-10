<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import type { RewardInfo } from '$declarations/rewards/rewards.did';
	import AirdropStateModal from '$lib/components/airdrops/AirdropStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalAirdropState } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getAirdrops } from '$lib/services/reward-code.services';
	import { modalStore } from '$lib/stores/modal.store';

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const initialLoading = sessionStorage.getItem('initialLoading');
		if (isNullish(initialLoading)) {
			const airdrops: RewardInfo[] = await getAirdrops({ identity: $authIdentity });
			if (airdrops.length > 0) {
				modalStore.openAirdropState();
			}
			sessionStorage.setItem('initialLoading', 'true');
		}
	});
</script>

<slot />

{#if $modalAirdropState}
	<AirdropStateModal />
{/if}
