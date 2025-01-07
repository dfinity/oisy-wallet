<script lang="ts">
	import { loading } from '$lib/stores/loader.store';
	import { page } from '$app/stores';
	import { nonNullish } from '@dfinity/utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { claimVipReward } from '$lib/services/reward-code.services';
	import { removeSearchParam } from '$lib/utils/nav.utils';
	import { modalStore } from '$lib/stores/modal.store';
	import { modalFailedRewardModal, modalSuccessfulRewardModal } from '$lib/derived/modal.derived';
	import SuccessfulRewardModal from '$lib/components/qr/SuccessfulRewardModal.svelte';
	import FailedRewardModal from '$lib/components/qr/FailedRewardModal.svelte';

	$: (async () => {
		if (!$loading && $page.url.searchParams.has('code') && nonNullish($authIdentity)) {
			const rewardCode = $page.url.searchParams.get('code');
			if (nonNullish(rewardCode)) {
				const result = await claimVipReward({ identity: $authIdentity, code: rewardCode });

				removeSearchParam({ url: $page.url, searchParam: 'code' });
				if (result.success) {
					modalStore.openSuccessfulReward();
				} else {
					modalStore.openFailedReward();
				}
			}
		}
	})();

</script>

<slot />

{#if $modalSuccessfulRewardModal}
	<SuccessfulRewardModal />
{:else if $modalFailedRewardModal}
	<FailedRewardModal />
{/if}