<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressStep } from '$lib/types/progress-step';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		steps: [ProgressStep, ...ProgressStep[]];
	}

	let { steps }: Props = $props();

	// Steps can follow each other within milliseconds; waiting for them to settle keeps a screen
	// reader from queueing one sentence per step.
	const ANNOUNCE_DELAY_MS = 500;

	let sentence = $derived.by(() => {
		const failed = steps.find(({ state }) => state === 'failed');

		if (nonNullish(failed)) {
			return replacePlaceholders($i18n.progress.failed_at, { $step: failed.text });
		}

		const index = steps.findIndex(({ state }) => state === 'in_progress');
		const current = steps[index];

		if (isNullish(current)) {
			return '';
		}

		return replacePlaceholders($i18n.progress.step_of, {
			$step: current.text,
			$current: `${index + 1}`,
			$total: `${steps.length}`
		});
	});

	let announcement = $state('');

	$effect(() => {
		const next = sentence;
		const timer = setTimeout(() => (announcement = next), ANNOUNCE_DELAY_MS);

		return () => clearTimeout(timer);
	});
</script>

<ol class="steps">
	{#each steps as { step, text, state } (step)}
		<li class={`step ${state}`} aria-current={state === 'in_progress' ? 'step' : undefined}>
			<span class="marker" aria-hidden="true">
				<!-- Keyed so a new state mounts a new marker: the old one leaves at once and only the
				     new one animates in. -->
				{#key state}
					{#if state === 'completed'}
						<span class="badge"><IconCheck size="14" /></span>
					{:else if state === 'failed'}
						<span class="badge"><IconClose size="12" /></span>
					{:else if state === 'in_progress'}
						<svg class="arc" viewBox="0 0 16 16">
							<circle
								cx="8"
								cy="8"
								fill="none"
								r="6"
								stroke="currentColor"
								stroke-opacity="0.25"
								stroke-width="2"
							/>
							<path
								d="M8 2a6 6 0 0 1 6 6"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-width="2"
							/>
						</svg>
					{:else}
						<span class="dot"></span>
					{/if}
				{/key}
			</span>

			<span class="text" data-label={text}>{text}</span>

			{#if state === 'failed'}
				<span class="state failed-tag">{$i18n.progress.failed}</span>
			{:else if state === 'completed'}
				<span class="state sr-only">{$i18n.progress.completed}</span>
			{:else if state === 'in_progress'}
				<span class="state sr-only">{$i18n.progress.in_progress}</span>
			{/if}
		</li>
	{/each}
</ol>

<span class="sr-only" role="status">{announcement}</span>

<style lang="scss">
	// A finished or failed badge springs in (stiffness 640, damping 22, mass 0.7), sampled into
	// `linear()` so no animation runtime is needed. Browsers without `linear()` get a close
	// overshooting bezier.
	$pop-easing: linear(
		0,
		0.074,
		0.25,
		0.468,
		0.683,
		0.866,
		1.004,
		1.093,
		1.138,
		1.148,
		1.134,
		1.106,
		1.074,
		1.043,
		1.016,
		0.997,
		0.985,
		0.979,
		0.978,
		0.981,
		0.985,
		0.99,
		0.994,
		0.998,
		1.001,
		1.002,
		1.003,
		1.003,
		1.003,
		1.002,
		1.001,
		1.001,
		1
	);
	$pop-easing-fallback: cubic-bezier(0.34, 1.56, 0.64, 1);
	$ease-out: cubic-bezier(0.2, 0, 0, 1);

	.steps {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.step {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		height: 2.25rem;
		padding: 0 0.25rem;
	}

	.marker {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
	}

	.dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 2px;
		background: var(--color-foreground-disabled-alt);
	}

	.badge {
		display: grid;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		animation: pop 440ms $pop-easing-fallback both;

		@supports (animation-timing-function: linear(0, 1)) {
			animation-timing-function: $pop-easing;
		}
	}

	.completed .badge {
		color: var(--color-foreground-success-secondary);
		background: var(--color-background-success-subtle-20);
	}

	.failed .badge {
		color: var(--color-foreground-error-primary);
		background: var(--color-background-error-subtle-20);
	}

	.arc {
		width: 0.9375rem;
		height: 0.9375rem;
		color: var(--color-foreground-tertiary);
		animation:
			spin 0.8s linear infinite,
			appear 180ms $ease-out;
	}

	// Set at 18 px and drawn at 16 px, so growing into the active step is a transform rather than
	// a reflow. One weight in every state: a weight change would shift the glyphs.
	.text {
		position: relative;
		flex: 0 1 19rem;
		min-width: 0;
		overflow: hidden;
		font-size: 1.125rem;
		line-height: 1.4;
		color: var(--color-foreground-disabled);
		white-space: nowrap;
		text-overflow: ellipsis;
		transform-origin: 0 50%;
		scale: calc(16 / 18);
		transition:
			color var(--animation-time-normal) ease-out,
			scale 240ms $ease-out;
	}

	.completed .text {
		color: var(--color-foreground-tertiary);
	}

	.in_progress .text {
		color: var(--color-foreground-primary);
		scale: 1;
	}

	.failed .text {
		color: var(--color-foreground-error-primary);
	}

	// The glint is a copy of the label laid on top, so the label keeps a solid colour and never
	// blinks when its step ends. Its gradient spans the label's box, which caps how fast it sweeps.
	.text::after {
		position: absolute;
		inset: 0;
		overflow: hidden;
		color: transparent;
		white-space: nowrap;
		text-overflow: ellipsis;
		content: attr(data-label) #{'/'} '';
		background-image: linear-gradient(
			90deg,
			transparent 38%,
			var(--color-foreground-tertiary) 50%,
			transparent 62%
		);
		background-size: 220% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		opacity: 0;
		transition: opacity var(--animation-time-normal);
		animation: glint 1.6s linear infinite;
		pointer-events: none;
	}

	.in_progress .text::after {
		opacity: 1;
	}

	// Failure is written out, not left to colour. Laid over the row so it never takes room from
	// the label.
	.failed-tag {
		position: absolute;
		top: 50%;
		right: 0.25rem;
		translate: 0 -50%;
		padding: 0.25rem 0.5rem;
		border-radius: 999px;
		font-size: var(--font-size-small);
		line-height: 1;
		color: var(--color-foreground-error-primary);
		background: var(--color-background-error-light);
		animation: tag-in 220ms $ease-out 120ms both;
	}

	@keyframes pop {
		from {
			opacity: 0;
			scale: 0.4;
		}
		to {
			opacity: 1;
			scale: 1;
		}
	}

	@keyframes appear {
		from {
			opacity: 0;
		}
	}

	@keyframes spin {
		to {
			rotate: 360deg;
		}
	}

	@keyframes glint {
		from {
			background-position: 120% 0;
		}
		to {
			background-position: -120% 0;
		}
	}

	@keyframes tag-in {
		from {
			opacity: 0;
			translate: 4px -50%;
		}
		to {
			opacity: 1;
			translate: 0 -50%;
		}
	}

	// The arc is a progress indicator and keeps turning; everything decorative stops and only the
	// colours change.
	@media (prefers-reduced-motion: reduce) {
		.badge,
		.failed-tag {
			animation: none;
		}

		.arc {
			animation: spin 0.8s linear infinite;
		}

		.text {
			transition: color var(--animation-time-normal) ease-out;
		}

		.text::after {
			display: none;
		}
	}
</style>
