<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		selected?: boolean;
		accent?: boolean;
		onClick?: () => void;
		children: Snippet;
	}

	let { selected = false, accent = false, onClick, children }: Props = $props();

	let lapping = $derived(accent && !selected);

	let laps = $state(0);
	let running = $state(false);

	const replayLaps = ({ pointerType }: PointerEvent) => {
		if (pointerType === 'touch' || running) {
			return;
		}

		laps++;
	};
</script>

<!-- The neutral border on the unselected state keeps the pill readable on any
	 surface: `bg-primary` alone is invisible on a `bg-primary` container (e.g. a
	 modal). Both states carry a 1px border so toggling selection never shifts the
	 layout. Hover darkens the selected fill and washes the unselected one.
	 `accent` looks like its neighbours at rest; what sets it apart is a brand-blue
	 arc that runs two laps around its border when the pill appears and again when
	 the pointer enters it, then goes away. It runs a set number of laps and not a
	 loop because the pills sit above a list people open every day, where constant
	 motion turns into noise. Selected, it matches every other pill, so which one
	 is on always reads the same.
	 The replay is driven by `pointerenter` rather than `:hover`, so leaving the
	 pill neither restarts the laps nor cuts them short, and entering it again
	 while they run does not start them over. -->
<button
	class={`relative shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
		selected
			? 'border-brand-primary bg-brand-primary text-primary-inverted hover:border-brand-secondary hover:bg-brand-secondary'
			: 'border-primary bg-primary text-secondary hover:bg-brand-subtle-10'
	}`}
	aria-pressed={selected}
	onclick={onClick}
	onpointerenter={lapping ? replayLaps : undefined}
	type="button"
>
	{#if lapping}
		{#key laps}
			<span
				class="pill-lap"
				aria-hidden="true"
				onanimationend={() => (running = false)}
				onanimationstart={() => (running = true)}
			></span>
		{/key}
	{/if}

	{@render children()}
</button>

<style lang="scss">
	// Registered so the angle interpolates; without @property support the arc only fades in and out.
	@property --pill-lap-angle {
		syntax: '<angle>';
		inherits: false;
		initial-value: 0deg;
	}

	// The arc is an overlay on the 1px border ring, masked to the ring, so the fill, the text and
	// the layout box never change. Both laps are one 720deg sweep, so the arc does not fade out
	// between them.
	.pill-lap {
		position: absolute;
		inset: -1px;
		padding: 1px;
		border-radius: inherit;
		background: conic-gradient(
			from var(--pill-lap-angle),
			transparent 0 70%,
			var(--color-border-brand-primary) 85%,
			transparent 100%
		);
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
		opacity: 0;
		pointer-events: none;
		animation: pill-lap 4s cubic-bezier(0.4, 0, 0.2, 1) 1;
	}

	@keyframes pill-lap {
		0% {
			opacity: 0;
			--pill-lap-angle: 0deg;
		}
		8%,
		92% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			--pill-lap-angle: 720deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pill-lap {
			animation: none;
		}
	}
</style>
