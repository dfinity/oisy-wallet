<script lang="ts">
	import type { ComponentType } from 'svelte';
	import Loaders from '$lib/components/loaders/Loaders.svelte';
	import NoLoaders from '$lib/components/core/NoLoaders.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';

	let cmpLoaders: ComponentType;
	$: cmpLoaders = $authSignedIn ? Loaders : NoLoaders;
</script>

<svelte:component this={cmpLoaders}>
	<slot />
</svelte:component>
