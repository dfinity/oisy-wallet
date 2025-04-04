<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { page } from '$app/stores';
	import VipRewardStateModal from '$lib/components/qr/VipRewardStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalVipRewardState } from '$lib/derived/modal.derived';
	import { claimVipReward, setReferrer } from '$lib/services/reward.services';
	import { loading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { removeSearchParam } from '$lib/utils/nav.utils';

	$: (async () => {
		if (!$loading && $page.url.searchParams.has('code') && nonNullish($authIdentity)) {
			const rewardCode = $page.url.searchParams.get('code');
			if (nonNullish(rewardCode)) {
				const result = await claimVipReward({ identity: $authIdentity, code: rewardCode });

				removeSearchParam({ url: $page.url, searchParam: 'code' });
				modalStore.openVipRewardState(result.success);
			}
		}

		if (!$loading && $page.url.searchParams.has('referrer') && nonNullish($authIdentity)) {
			const referrerCode = $page.url.searchParams.get('referrer');
			if (nonNullish(referrerCode)) {
				const numericalReferrerCode = Number(referrerCode);
				if (!isNaN(numericalReferrerCode)) {
					await setReferrer({ identity: $authIdentity, referrerCode: numericalReferrerCode });
				}
				removeSearchParam({ url: $page.url, searchParam: 'referrer' });
			}
		}
	})();

	let rewardState: boolean | undefined;
	$: rewardState = $modalVipRewardState ? ($modalStore?.data as boolean | undefined) : undefined;
</script>

<slot />

{#if nonNullish(rewardState)}
	<VipRewardStateModal isSuccessful={rewardState} />
{/if}
