<script generics="T extends string" lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, tick } from 'svelte';

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
	let pill = $state<{ x: number; y: number; width: number; height: number } | undefined>();
	let animated = $state(false);

	let selectedIndex = $derived(
		Math.max(
			options.findIndex((option) => option.value === value),
			0
		)
	);

	const measure = () => {
		const button = buttons[selectedIndex];

		if (isNullish(button)) {
			return;
		}

		pill = {
			x: button.offsetLeft,
			y: button.offsetTop,
			width: button.offsetWidth,
			height: button.offsetHeight
		};
	};

	// Motion starts on the frame after the pill was placed, so placing it never animates.
	let animationFrame: number | undefined;

	const animateFromNextFrame = () => {
		if (nonNullish(animationFrame)) {
			cancelAnimationFrame(animationFrame);
		}

		animationFrame = requestAnimationFrame(() => {
			animationFrame = undefined;
			animated = true;
		});
	};

	onDestroy(() => {
		if (nonNullish(animationFrame)) {
			cancelAnimationFrame(animationFrame);
		}
	});

	$effect(() => {
		[selectedIndex, options.length];

		measure();

		if (!animated) {
			tick().then(animateFromNextFrame);
		}
	});

	// A new width (rotation, a resized modal) moves the pill without animating it.
	$effect(() => {
		if (isNullish(container)) {
			return;
		}

		const observer = new ResizeObserver(() => {
			animated = false;
			measure();
			animateFromNextFrame();
		});

		observer.observe(container);

		return () => observer.disconnect();
	});

	const select = (index: number) => {
		const option = options[index];

		if (isNullish(option)) {
			return;
		}

		({ value } = option);
		buttons[index]?.focus();
	};

	// Arrow keys move and select, as in a radio group, and wrap around; Home and End jump to either end.
	const KEY_TARGETS: Record<string, (params: { index: number; last: number }) => number> = {
		ArrowRight: ({ index, last }) => (index === last ? 0 : index + 1),
		ArrowDown: ({ index, last }) => (index === last ? 0 : index + 1),
		ArrowLeft: ({ index, last }) => (index === 0 ? last : index - 1),
		ArrowUp: ({ index, last }) => (index === 0 ? last : index - 1),
		Home: () => 0,
		End: ({ last }) => last
	};

	const onKeyDown = ({ event, index }: { event: KeyboardEvent; index: number }) => {
		const target = KEY_TARGETS[event.key];

		if (isNullish(target)) {
			return;
		}

		event.preventDefault();
		select(target({ index, last: options.length - 1 }));
	};
</script>

<div
	bind:this={container}
	class="relative isolate flex w-full items-center rounded-full border border-secondary bg-brand-subtle-10 p-[3px] select-none"
	aria-label={ariaLabel}
	data-tid={testId}
	role="radiogroup"
>
	{#if pill !== undefined}
		<span
			style={`transform: translate(${pill.x}px, ${pill.y}px); width: ${pill.width}px; height: ${pill.height}px`}
			class="pill pointer-events-none absolute top-0 left-0 rounded-full border border-secondary bg-primary shadow-sm"
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
