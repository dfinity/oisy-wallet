<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let hideInfo: boolean;
</script>

{#if !hideInfo}
	<div
		class="border-2 border-dust bg-white rounded-lg mb-12 py-4 px-6 relative"
		transition:slide={{ easing: quintOut, axis: 'y' }}
	>
		<button class="text absolute top-2 right-2" on:click><IconClose size="24px" /></button>

		<slot />
	</div>
{/if}
