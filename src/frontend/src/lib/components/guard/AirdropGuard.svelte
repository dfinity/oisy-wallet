<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import AirdropStateModal from '$lib/components/airdrops/AirdropStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalAirdropState } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { modalStore } from '$lib/stores/modal.store';
	import { loadAirdropResult } from '$lib/utils/airdrops.utils';

	let isJackpot: boolean | undefined;
	$: isJackpot = $modalAirdropState ? ($modalStore?.data as boolean | undefined) : undefined;

	onMount(async () => {
		if (isNullish($authIdentity)) {
			nullishSignOut();
			return;
		}

		const { receivedAirdrop, receivedJackpot } = await loadAirdropResult($authIdentity);
		if (receivedAirdrop) {
			modalStore.openAirdropState(receivedJackpot);
		}
	});
</script>

<slot />

{#if $modalAirdropState && nonNullish(isJackpot)}
	<AirdropStateModal jackpot={isJackpot} />
{/if}
