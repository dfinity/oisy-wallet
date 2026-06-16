<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		hideInfo: boolean;
		children: Snippet;
		onClick: () => void;
	}

	let { hideInfo, children, onClick }: Props = $props();
</script>

{#if !hideInfo}
	<div
		class="bg-primary text-primary relative mb-12 rounded-lg px-6 py-4"
		transition:slide={SLIDE_EASING}
	>
		<button
			class="text-tertiary absolute top-2 right-2"
			aria-label={$i18n.core.text.close}
			onclick={onClick}><IconClose /></button
		>
		{@render children()}
	</div>
{/if}
