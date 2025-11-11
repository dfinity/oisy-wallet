<script lang="ts">
	import Earning from '$lib/components/earning/Earning.svelte';
	import GldtStakeContext from '$icp/components/stake/gldt/GldtStakeContext.svelte';
	import { setContext } from 'svelte';
	import {
		GLDT_STAKE_CONTEXT_KEY,
		type GldtStakeContext as GldtStakeContextType,
		initGldtStakeStore
	} from '$icp/stores/gldt-stake.store';
	import RewardsEligibilityContext from '$lib/components/rewards/RewardsEligibilityContext.svelte';

	setContext<GldtStakeContextType>(GLDT_STAKE_CONTEXT_KEY, {
		store: initGldtStakeStore()
	});
</script>

<RewardsEligibilityContext>
	<GldtStakeContext>
		<Earning />
	</GldtStakeContext>
</RewardsEligibilityContext>
