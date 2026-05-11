<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	interface Props {
		visible: boolean;
		button?: HTMLButtonElement;
		content: Snippet;
	}

	let { visible = $bindable(), button, content }: Props = $props();

	// gix `Popover` anchors the rtl wrapper with `right: window.innerWidth - anchor.right`
	// measured from an overlay that itself sits at the *inner* viewport edge. Because
	// `window.innerWidth` includes the scrollbar, the panel ends up offset left by
	// `scrollbarWidth`. Re-set `right` from `documentElement.clientWidth` (scrollbar
	// excluded) on the wrapper rendered as a sibling of the trigger.
	$effect(() => {
		if (!visible || !button) {
			return;
		}

		const trigger = button;

		const findWrapper = (): HTMLElement | null => {
			let node: Element | null = trigger.nextElementSibling;
			while (node !== null && !(node instanceof HTMLElement && node.matches('div.popover'))) {
				node = node.nextElementSibling;
			}
			return node instanceof HTMLElement ? node.querySelector<HTMLElement>('.wrapper.rtl') : null;
		};

		const align = () => {
			const wrapper = findWrapper();
			if (wrapper === null) {
				return;
			}
			const { right } = trigger.getBoundingClientRect();
			wrapper.style.right = `${document.documentElement.clientWidth - right}px`;
		};

		const raf = requestAnimationFrame(align);
		window.addEventListener('resize', align);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', align);
		};
	});
</script>

<Responsive up="sm">
	<Popover anchor={button} direction="rtl" invisibleBackdrop bind:visible>
		{@render content()}
	</Popover>
</Responsive>
<Responsive down="sm">
	<BottomSheet {content} bind:visible>
		{#snippet footer()}
			<ButtonDone onclick={() => (visible = false)} variant="secondary-light" />
		{/snippet}
	</BottomSheet>
</Responsive>
