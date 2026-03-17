<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import {
		GLDT_STAKE_CONTEXT_KEY,
		type GldtStakeContext,
		gldtStakeStore
	} from '$icp/stores/gldt-stake.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY, {
		store: gldtStakeStore
	});
</script>

{@render children()}
