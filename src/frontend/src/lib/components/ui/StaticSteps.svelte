<script lang="ts">
	import { IconCheckCircle, IconInfo } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { StaticStep } from '$lib/types/steps';

	export let steps: [StaticStep, ...StaticStep[]];
</script>

{#each steps as { text, state, progressLabel }, i}
	{@const last = i === steps.length - 1}
	<div class={`step ${state} ${last ? 'last' : ''}`}>
		{#if state === 'completed'}
			<IconCheckCircle />
		{:else if state === 'skipped'}
			<IconInfo size="27px" />
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

<style lang="scss">
	.step {
		display: grid;
		grid-template-columns: max-content auto;
		grid-template-rows: repeat(2, auto);

		align-items: center;

		column-gap: var(--padding-2x);
		row-gap: var(--padding);

		padding: 0 0 var(--padding);

		--icon-check-circle-background: var(--positive-emphasis);
		--icon-check-circle-color: white;

		color: var(--value-color);
		transition: color var(--animation-time-normal) ease-out;
	}

	.line,
	.state {
		align-self: flex-start;
	}

	.in_progress,
	.next {
		.line {
			--line-color: var(--progress-color);
		}
	}

	.in_progress {
		color: var(--progress-color);

		--icon-check-circle-background: var(--progress-color);
		--icon-check-circle-color: var(--progress-color-contrast);

		.state {
			color: var(--progress-color);
			background: rgba(var(--progress-color-rgb), 0.3);
		}
	}

	.next {
		color: var(--tertiary);

		--icon-check-circle-background: transparent;
		--icon-check-circle-color: var(--tertiary);
		--icon-check-circle-border-color: var(--tertiary);
	}

	.state {
		display: inline-flex;
		gap: var(--padding-0_5x);

		font-size: var(--font-size-small);
		line-height: var(--line-height-small);

		color: var(--positive-emphasis);
		background: rgba(var(--positive-emphasis-rgb), 0.3);

		width: fit-content;

		padding: var(--padding-0_5x) var(--padding);
		border-radius: var(--border-radius-0_5x);

		margin-bottom: var(--padding-4x);

		div {
			position: relative;
		}
	}

	.line {
		height: 100%;
		min-height: calc(4 * var(--padding));
		--line-color: var(--positive-emphasis);
		background: linear-gradient(var(--line-color), var(--line-color)) no-repeat center/1.5px 100%;
	}

	.checkmark {
		font-size: var(--font-size-small);
		line-height: var(--line-height-small);

		color: var(--progress-color);
		--checkmark-color: var(--progress-color);
	}

	.spinner {
		width: 24px;
		height: 24px;

		position: relative;

		display: flex;
		justify-content: center;
		align-items: center;
	}

	.round {
		width: 22px;
		height: 22px;

		border-radius: 50%;

		display: flex;
		justify-content: center;
		align-items: center;
		border: 1px solid var(--checkmark-color);
	}

	.completed {
		color: var(--positive-emphasis);
	}
</style>
