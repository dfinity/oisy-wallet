<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import AirdropStateModal from '$lib/components/airdrops/AirdropStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalAirdropState } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { loadAirdropResult } from '$lib/utils/airdrops.utils';

	let isJackpot: boolean | undefined;
	$: isJackpot = $modalAirdropState ? ($modalStore?.data as boolean | undefined) : undefined;

	const checkAirDrop = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const { receivedAirdrop, receivedJackpot } = await loadAirdropResult($authIdentity);

		if (receivedAirdrop) {
			modalStore.openAirdropState(receivedJackpot);
		}
	};

	onMount(checkAirDrop);

	// the below is just temporary pseudo-code
	const interval = setInterval(checkAirDrop, 30000);
	onDestroy(() => {
		clearInterval(interval);
	});
</script>

<slot />

{#if $modalAirdropState && nonNullish(isJackpot)}
	<AirdropStateModal jackpot={isJackpot} />
{/if}
