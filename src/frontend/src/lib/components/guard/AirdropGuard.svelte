<script lang="ts">
    import { isNullish } from '@dfinity/utils';
    import { onMount } from 'svelte';
    import { authIdentity } from '$lib/derived/auth.derived';
    import { nullishSignOut } from '$lib/services/auth.services';
    import { getAirdrops } from '$lib/services/reward-code.services';

    onMount(async () => {
        if (isNullish($authIdentity)) {
            await nullishSignOut();
            return;
        }
        const initialLoading = sessionStorage.getItem('initialLoading');
        if (isNullish(initialLoading)) {
            const { airdrops, lastTimestamp } = await getAirdrops({ identity: $authIdentity });
            const newAirdrops = airdrops.filter((airdrop) => airdrop.timestamp >= lastTimestamp);

            if (newAirdrops.length > 0) {
                const containsJackpot = newAirdrops.some((airdrop) => airdrop.name === 'jackpot');
                // TODO open airdrop modal
            }
            sessionStorage.setItem('initialLoading', 'true');
        }
    });
</script>

<slot />