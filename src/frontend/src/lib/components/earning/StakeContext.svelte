<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import GldtStakeContext from '$icp/components/stake/gldt/GldtStakeContext.svelte';
	import {
		GLDT_STAKE_CONTEXT_KEY,
		type GldtStakeContext as GldtStakeContextType,
		gldtStakeStore
	} from '$icp/stores/gldt-stake.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setContext<GldtStakeContextType>(GLDT_STAKE_CONTEXT_KEY, {
		store: gldtStakeStore
	});
</script>

<GldtStakeContext>
	{@render children()}
</GldtStakeContext>
