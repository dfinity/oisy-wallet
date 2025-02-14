<script lang="ts">
    import {isNullish, nonNullish} from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadAirdropResult } from '$lib/utils/airdrops.utils';
    import {modalStore} from "$lib/stores/modal.store";
    import {modalAirdropState} from "$lib/derived/modal.derived";
    import AirdropStateModal from "$lib/components/airdrops/AirdropStateModal.svelte";

    let isJackpot: boolean | undefined;
    $: isJackpot = $modalAirdropState ? ($modalStore?.data as boolean | undefined) : undefined;

	onMount(async () => {
		if (isNullish($authIdentity)) {
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