<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
    import {loadAirdropResult} from "$lib/utils/airdrops.utils";

	onMount(async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const {isAirdrop} = loadAirdropResult($authIdentity);
        if (isAirdrop) {
            // TODO open airdrop state modal with isJackpot state
        }
	});
</script>

<slot />
