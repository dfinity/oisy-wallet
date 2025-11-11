<script lang="ts">
	import Earning from '$lib/components/earning/Earning.svelte';
	import GldtStakeContext from '$icp/components/stake/gldt/GldtStakeContext.svelte';
	import { setContext } from 'svelte';
	import {
		GLDT_STAKE_CONTEXT_KEY,
		type GldtStakeContext as GldtStakeContextType,
		initGldtStakeStore
	} from '$icp/stores/gldt-stake.store';

	setContext<GldtStakeContextType>(GLDT_STAKE_CONTEXT_KEY, {
		store: initGldtStakeStore()
	});
</script>

<GldtStakeContext>
	<Earning />
</GldtStakeContext>
