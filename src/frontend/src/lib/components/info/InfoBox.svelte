<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import { slide } from 'svelte/transition';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';

	export let hideInfo: boolean;
</script>

{#if !hideInfo}
	<div
		class="relative mb-12 rounded-lg bg-primary px-6 py-4 text-primary"
		transition:slide={SLIDE_EASING}
	>
		<button class="absolute right-2 top-2 text-tertiary" on:click aria-label={$i18n.core.text.close}
			><IconClose /></button
		>
		<slot />
	</div>
{/if}
