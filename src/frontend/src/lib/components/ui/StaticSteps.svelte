<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconCheckCircle from '$lib/components/icons/IconCheckCircle.svelte';
	import IconGixInfo from '$lib/components/icons/IconGixInfo.svelte';
	import type { StaticStep } from '$lib/types/steps';
	import type { NonEmptyArray } from '$lib/types/utils';

	interface Props {
		steps: NonEmptyArray<StaticStep>;
	}

	let { steps }: Props = $props();
</script>

{#each steps as { text, state, progressLabel, step }, i (step)}
	{@const last = i === steps.length - 1}
	<div class={`step ${state} ${last ? 'last' : ''}`}>
		{#if state === 'completed'}
			<IconCheckCircle />
		{:else if state === 'skipped'}
			<IconGixInfo size="27px" />
		{:else}
			<span class="checkmark round">{i + 1}</span>
		{/if}

		<h3 class={`${state}`}>{text}</h3>

		<div class:line={!last}></div>

		{#if nonNullish(progressLabel) && state === 'in_progress'}
			<span class="state">{progressLabel}</span>
		{/if}
	</div>
{/each}
