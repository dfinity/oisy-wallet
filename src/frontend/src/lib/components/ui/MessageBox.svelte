<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		children: Snippet;
		icon?: Snippet;
		level?: 'plain' | 'info' | 'warning' | 'error' | 'success';
		styleClass?: string;
		testId?: string;
		onDismiss?: () => void;
	}

	let { children, icon, level = 'info', styleClass, testId, onDismiss }: Props = $props();

	const closable = $derived(nonNullish(onDismiss));
	let visible = $state(true);

	const close = () => {
		visible = false;
		onDismiss?.();
	};
</script>

{#if visible}
	<div
		class={`mb-4 flex items-start gap-4 rounded-xl px-4 py-3 text-sm font-medium sm:text-base ${styleClass ?? ''}`}
		class:bg-brand-light={level === 'info'}
		class:bg-error-light={level === 'error'}
		class:bg-primary={level === 'plain'}
		class:bg-success-light={level === 'success'}
		class:bg-warning-light={level === 'warning'}
		data-tid={testId}
		transition:slide={SLIDE_EASING}
	>
		{#if nonNullish(icon)}
			{@render icon()}
		{:else}
			<div
				class="min-w-5 py-0 sm:py-0.5"
				class:text-brand-primary={level === 'plain' || level === 'info'}
				class:text-error-secondary={level === 'error'}
				class:text-success-secondary={level === 'success'}
				class:text-warning-primary={level === 'warning'}
			>
				<IconInfo />
			</div>
		{/if}
		<div
			class:text-error-secondary={level === 'error'}
			class:text-primary={level === 'plain' || level === 'info' || level === 'warning'}
			class:text-success-secondary={level === 'success'}
		>
			{@render children()}
		</div>
		{#if closable}
			<button
				class="ml-auto p-0.5 text-tertiary"
				aria-label={$i18n.core.text.close}
				onclick={close}
			>
				<IconClose />
			</button>
		{/if}
	</div>
{/if}
