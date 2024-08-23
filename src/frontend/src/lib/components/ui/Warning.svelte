<script lang="ts">
	import { IconInfo, IconWarning } from '@dfinity/gix-components';
	import type { ComponentType } from 'svelte';

	export let info = false;

	let icon: ComponentType;
	$: icon = info ? IconInfo : IconWarning;
</script>

<div class="bg-dark-blue text-off-white rounded-lg p-4 mb-4 flex gap-4">
	<div style="min-width: 44px" class:text-goldenrod={!info}>
		<svelte:component this={icon} size="44px" />
	</div>
	<div>
		<slot />
	</div>
</div>
