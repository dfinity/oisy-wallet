<script lang="ts">
	import {fromNullable, isNullish, nonNullish} from '@dfinity/utils';
	import { onMount } from 'svelte';
	import AirdropStateModal from '$lib/components/airdrops/AirdropStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalAirdropState } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getAirdrops } from '$lib/services/reward-code.services';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AirdropsResponse } from '$lib/types/airdrop';

	let isJackpot: boolean | undefined;
	$: isJackpot = $modalAirdropState ? ($modalStore?.data as boolean | undefined) : undefined;

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const initialLoading = sessionStorage.getItem('initialLoading');
		if (isNullish(initialLoading)) {
			const airdropsResponse: AirdropsResponse = await getAirdrops({ identity: $authIdentity });
			const newAirdrops = airdropsResponse.airdrops.filter((airdrop) => airdrop.timestamp >= airdropsResponse.last_timestamp);

			if (newAirdrops.length > 0) {
				const containsJackpot = newAirdrops.some((airdrop) => fromNullable(airdrop.name) === 'jackpot');
				modalStore.openAirdropState(containsJackpot);
			}
			sessionStorage.setItem('initialLoading', 'true');
		}
	});
</script>

<slot />

{#if $modalAirdropState && nonNullish(isJackpot)}
	<AirdropStateModal jackpot={isJackpot} />
{/if}
