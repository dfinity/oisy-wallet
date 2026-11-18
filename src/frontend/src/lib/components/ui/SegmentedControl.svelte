<script generics="T extends string" lang="ts">
	import { tick } from 'svelte';

	interface Option {
		value: T;
		label: string;
		testId?: string;
	}

	interface Props {
		options: Option[];
		value: T;
		ariaLabel: string;
		testId?: string;
	}

	let { options, value = $bindable(), ariaLabel, testId }: Props = $props();

	let container = $state<HTMLDivElement | undefined>();
	let buttons = $state<HTMLButtonElement[]>([]);

	// The selected pill slides under the chosen segment; it is placed without motion the first time,
	// so it does not fly in when the control appears.
	let pill = $state<{ x: number; width: number } | undefined>();
	let animated = $state(false);

	let selectedIndex = $derived(
		Math.max(
			options.findIndex((option) => option.value === value),
			0
		)
	);

	const measure = () => {
		const button = buttons[selectedIndex];

		if (button === undefined) {
			return;
		}

		pill = { x: button.offsetLeft, width: button.offsetWidth };
	};

	$effect(() => {
		[selectedIndex, options.length];

		measure();

		if (!animated) {
			tick().then(() => requestAnimationFrame(() => (animated = true)));
		}
	});

	// A new width (rotation, a resized modal) moves the pill without animating it.
	$effect(() => {
		if (container === undefined) {
			return;
		}

		const observer = new ResizeObserver(() => {
			animated = false;
			measure();
			requestAnimationFrame(() => (animated = true));
		});

		observer.observe(container);

		return () => observer.disconnect();
	});

	const select = (index: number) => {
		const option = options[index];

		if (option === undefined) {
			return;
		}

		({ value } = option);
		buttons[index]?.focus();
	};

	// Arrow keys move and select, as in a radio group; Home and End jump to either end.
	const onKeyDown = ({ event, index }: { event: KeyboardEvent; index: number }) => {
		const last = options.length - 1;

		const next =
			event.key === 'ArrowRight' || event.key === 'ArrowDown'
				? index === last
					? 0
					: index + 1
				: event.key === 'ArrowLeft' || event.key === 'ArrowUp'
					? index === 0
						? last
						: index - 1
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? last
							: undefined;

		if (next === undefined) {
			return;
		}

		event.preventDefault();
		select(next);
	};
</script>

<div
	bind:this={container}
	style="isolation: isolate"
	class="relative flex w-full items-center rounded-full border border-secondary bg-brand-subtle-10 p-[3px] select-none"
	aria-label={ariaLabel}
	data-tid={testId}
	role="radiogroup"
>
	{#if pill !== undefined}
		<span
			style={`transform: translateX(${pill.x - 3}px); width: ${pill.width}px`}
			class="pill pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] rounded-full border border-secondary bg-primary shadow-sm"
			class:animated
			aria-hidden="true"
		></span>
	{/if}

	{#each options as option, index (option.value)}
		{@const selected = index === selectedIndex}
		<button
			bind:this={buttons[index]}
			class="relative z-10 flex min-w-0 flex-1 items-center justify-center rounded-full border-0 bg-transparent px-4 py-2 text-sm leading-none font-semibold text-primary press"
			aria-checked={selected}
			data-tid={option.testId}
			onclick={() => select(index)}
			onkeydown={(event) => onKeyDown({ event, index })}
			role="radio"
			tabindex={selected ? 0 : -1}
			type="button"
		>
			<span class="label truncate" class:selected>{option.label}</span>
		</button>
	{/each}
</div>

<style lang="scss">
	// A short spring: the pill overshoots a little and settles, as a thumb does when it is let go.
	.pill.animated {
		transition:
			transform 320ms cubic-bezier(0.34, 1.3, 0.64, 1),
			width 320ms cubic-bezier(0.34, 1.3, 0.64, 1);

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}
	}

	.label {
		opacity: 0.6;
		transition: opacity 150ms ease-out;

		&.selected {
			opacity: 1;
		}
	}

	button:hover .label:not(.selected) {
		opacity: 0.8;
	}
</style>
