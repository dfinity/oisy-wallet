<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { page } from '$app/stores';
	import RewardStateModal from '$lib/components/qr/RewardStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalRewardState } from '$lib/derived/modal.derived';
	import { claimVipReward } from '$lib/services/reward-code.services';
	import { loading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { removeSearchParam } from '$lib/utils/nav.utils';

	$: (async () => {
		if (!$loading && $page.url.searchParams.has('code') && nonNullish($authIdentity)) {
			const rewardCode = $page.url.searchParams.get('code');
			if (nonNullish(rewardCode)) {
				const result = await claimVipReward({ identity: $authIdentity, code: rewardCode });

				removeSearchParam({ url: $page.url, searchParam: 'code' });
				modalStore.openRewardState(result.success);
			}
		}
	})();

	let rewardState: boolean | undefined;
	$: rewardState = $modalRewardState ? ($modalStore?.data as boolean | undefined) : undefined;
</script>

<slot />

{#if nonNullish(rewardState)}
	<RewardStateModal isSuccessful={rewardState} />
{/if}
