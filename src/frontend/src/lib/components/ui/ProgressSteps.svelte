<script lang="ts">
	import IconCheckCircle from '$lib/components/icons/IconCheckCircle.svelte';
	import IconCloseCircle from '$lib/components/icons/IconCloseCircle.svelte';
	import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressStep } from '$lib/types/progress-step';

	interface Props {
		steps: [ProgressStep, ...ProgressStep[]];
	}

	let { steps }: Props = $props();
</script>

{#each steps as { step, text, state }, i (step)}
	{@const last = i === steps.length - 1}
	<div class={`step ${state} ${last ? 'last' : ''}`}>
		{#if state === 'completed'}
			<IconCheckCircle />
		{:else if state === 'failed'}
			<IconCloseCircle />
		{:else if state === 'in_progress'}
			<div class="spinner">
				<span class="checkmark">{i + 1}</span>
				<LoaderSpinner size="small" />
			</div>
		{:else}
			<span class="checkmark round">{i + 1}</span>
		{/if}

		<span class="text">{text}</span>

		<div class:line={!last}></div>

		{#if state === 'completed'}
			<span class="state">{$i18n.progress.completed}</span>
		{:else if state === 'failed'}
			<span class="state">{$i18n.progress.failed}</span>
		{:else if state === 'in_progress'}
			<div class="state">
				<span>{$i18n.progress.in_progress}</span>
			</div>
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
			--line-color: var(--tertiary);
		}
	}

	.in_progress {
		color: var(--progress-color);

		--icon-check-circle-background: var(--progress-color);
		--icon-check-circle-color: var(--progress-color-contrast);

		.checkmark {
			--checkmark-color: var(--progress-color);
		}
	}

	.completed {
		// Custom properties cascade into the IconCheckCircle child component.
		--icon-check-circle-background: var(--color-background-brand-primary);
		--icon-check-circle-color: var(--color-foreground-primary-inverted);

		.line {
			--line-color: var(--color-background-brand-primary);
		}

		.state {
			color: var(--color-foreground-success-primary);
			background: var(--color-background-success-subtle-30);
		}
	}

	.failed {
		color: var(--negative-emphasis);
		--icon-close-circle-background: var(--negative-emphasis);
		--icon-close-circle-color: white;

		.line {
			--line-color: var(--negative-emphasis);
		}

		.state {
			color: var(--negative-emphasis);
			background: var(--color-background-error-light);
		}

		.checkmark {
			--checkmark-color: var(--negative-emphasis);
		}
	}

	.next {
		color: var(--tertiary);

		--icon-check-circle-background: transparent;
		--icon-check-circle-color: var(--tertiary);
		--icon-check-circle-border-color: var(--tertiary);

		.text {
			color: var(--color-foreground-primary);
		}
	}

	.state {
		display: inline-flex;
		gap: var(--padding-0_5x);

		font-size: var(--font-size-small);
		line-height: var(--line-height-small);

		// Folded in from the former gix.scss override layer (OISY-owned colors).
		color: var(--color-foreground-brand-primary-alt);
		background: var(--color-background-brand-subtle-30);

		width: fit-content;

		padding: var(--padding-0_5x) var(--padding);
		border-radius: var(--border-radius-0_5x);

		div {
			position: relative;
		}
	}

	.line {
		height: calc(5 * var(--padding));
		--line-color: var(--positive-emphasis);
		background: linear-gradient(var(--line-color), var(--line-color)) no-repeat center / 1.5px 100%;
	}

	.checkmark {
		font-size: var(--font-size-small);
		line-height: var(--line-height-small);

		--checkmark-color: var(--tertiary);
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
</style>
