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

		color: var(--color-foreground-primary);
		transition: color var(--animation-time-normal) ease-out;
	}

	.line,
	.state {
		align-self: flex-start;
	}

	.in_progress,
	.next {
		.line {
			--line-color: var(--color-background-brand-primary);
		}
	}

	.in_progress {
		color: var(--color-foreground-primary-inverted);

		--icon-check-circle-background: var(--color-background-brand-primary);
		--icon-check-circle-color: var(--color-background-brand-primary-alt);

		.state {
			color: var(--color-foreground-primary-inverted);
			background: var(--color-background-brand-subtle-20);
		}
	}

	.next {
		color: var(--color-foreground-primary);

		--icon-check-circle-background: transparent;
		--icon-check-circle-color: var(--color-foreground-primary);
		--icon-check-circle-border-color: var(--color-foreground-primary);
	}

	.state {
		display: inline-flex;
		gap: var(--padding-0_5x);

		font-size: var(--font-size-small);
		line-height: var(--line-height-small);

		color: var(--color-foreground-primary-inverted);
		background: var(--color-background-success-subtle-20);

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
		--line-color: var(--color-background-success-primary);
		background: var(--color-background-brand-primary);
	}

	.checkmark {
		font-size: var(--font-size-small);
		line-height: var(--line-height-small);

		color: var(--color-foreground-primary);
		--checkmark-color: var(--color-background-brand-primary);
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
		border: 1px solid var(--color-background-brand-primary);
	}

	.completed {
		color: var(--color-background-success-primary);
	}
</style>
