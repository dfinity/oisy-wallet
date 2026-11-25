<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import IconCloseThin from '$lib/components/icons/IconCloseThin.svelte';
	import IconList from '$lib/components/icons/IconList.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { landingSectionLinks } from '$lib/utils/landing.utils';
	import { fade, fly } from '$lib/utils/transitions.utils';

	const MENU_ID = 'landing-section-menu';
	// The item nearest the button leaves it first.
	const ITEM_STAGGER_MS = 30;

	let open = $state(false);
	let focusFirstItem = false;
	let root = $state<HTMLElement | undefined>();
	let button = $state<HTMLButtonElement | undefined>();

	const links = $derived(landingSectionLinks($i18n));

	const toggle = ({ detail }: MouseEvent) => {
		open = !open;
		// Enter and Space click with detail 0: only a keyboard opening moves focus into the menu.
		focusFirstItem = open && detail === 0;
	};

	const close = () => (open = false);

	const focusFirst: Attachment<HTMLElement> = (node) => {
		if (focusFirstItem) {
			node.querySelector('a')?.focus();
			focusFirstItem = false;
		}
	};

	const onKeydown = ({ key }: KeyboardEvent) => {
		if (key === 'Escape' && open) {
			close();
			button?.focus();
		}
	};

	const onPointerdown = ({ target }: PointerEvent) => {
		if (open && target instanceof Node && !root?.contains(target)) {
			close();
		}
	};

	const onFocusout = ({ relatedTarget }: FocusEvent) => {
		if (relatedTarget instanceof Node && !root?.contains(relatedTarget)) {
			close();
		}
	};
</script>

<svelte:window onkeydown={onKeydown} />
<svelte:document onpointerdown={onPointerdown} />

<!-- Below `lg` this replaces the header's section row: one button above the thumb, items on demand. -->
<div
	bind:this={root}
	class="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-2 flex flex-col items-center gap-2 px-4 lg:hidden"
	onfocusout={onFocusout}
>
	{#if open}
		<nav
			id={MENU_ID}
			class="pointer-events-auto max-w-full"
			{@attach focusFirst}
			aria-label={$i18n.auth.landing.sections_label}
			out:fade
		>
			<!-- `role="list"`: Safari drops the semantics of a list without bullets. -->
			<ul class="m-0 flex list-none flex-col items-stretch gap-2 p-0" role="list">
				{#each links as { href, label }, index (href)}
					<li in:fly|global={{ y: 8, delay: (links.length - 1 - index) * ITEM_STAGGER_MS }}>
						<a
							class="flex min-h-12 items-center justify-center rounded-full border border-tertiary bg-primary px-6 py-2 text-center text-base font-semibold text-balance text-primary no-underline shadow-md transition-[color,background-color,scale] duration-150 ease-out press hover:bg-brand-subtle-10 hover:text-brand-hover active:bg-brand-subtle-20 active:text-brand-hover"
							{href}
							onclick={close}
						>
							{label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}

	<button
		bind:this={button}
		class="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full border border-tertiary bg-primary/85 px-5 text-base font-semibold text-primary shadow-lg backdrop-blur-md transition-[background-color,scale] duration-150 ease-out press hover:bg-brand-subtle-10"
		aria-controls={MENU_ID}
		aria-expanded={open}
		onclick={toggle}
		type="button"
	>
		<span class="icons relative grid size-5 place-items-center" aria-hidden="true">
			<span class="icon" class:shown={!open}><IconList /></span>
			<span class="icon" class:shown={open}><IconCloseThin /></span>
		</span>
		{$i18n.auth.landing.sections_button}
	</button>
</div>

<style lang="scss">
	// Both icons stay in the DOM and cross-fade, so the swap animates both ways.
	.icon {
		grid-area: 1 / 1;
		display: grid;
		opacity: 0;
		scale: 0.25;
		filter: blur(4px);
		transition-property: opacity, scale, filter;
		transition-duration: 200ms;
		transition-timing-function: cubic-bezier(0.2, 0, 0, 1);

		&.shown {
			opacity: 1;
			scale: 1;
			filter: blur(0);
		}

		@media (prefers-reduced-motion: reduce) {
			scale: 1;
			filter: none;
			transition-property: opacity;
		}
	}
</style>
