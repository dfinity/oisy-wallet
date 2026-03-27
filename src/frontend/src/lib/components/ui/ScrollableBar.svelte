<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Action } from 'svelte/action';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const BLUR_SIZE = '60px';
	const FADE_BOTH = `linear-gradient(to right, transparent, black ${BLUR_SIZE}, black calc(100% - ${BLUR_SIZE}), transparent)`;
	const FADE_LEFT = `linear-gradient(to right, transparent, black ${BLUR_SIZE})`;
	const FADE_RIGHT = `linear-gradient(to right, black calc(100% - ${BLUR_SIZE}), transparent)`;

	const setMask = ({ node, mask }: { node: HTMLDivElement; mask: string }): void => {
		node.style.maskImage = mask;
		node.style.webkitMaskImage = mask;
	};

	const scrollFade: Action<HTMLDivElement, undefined> = (node) => {
		const threshold = 2;
		const mediaQuery = window.matchMedia('(min-width: 768px)');

		const update = (): void => {
			if (mediaQuery.matches) {
				setMask({ node, mask: 'none' });
				return;
			}

			const { scrollLeft, scrollWidth, clientWidth } = node;
			const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);

			const hasLeftFade = scrollLeft > threshold;
			const hasRightFade = scrollLeft < maxScrollLeft - threshold;

			const mask =
				hasLeftFade && hasRightFade
					? FADE_BOTH
					: hasLeftFade
						? FADE_LEFT
						: hasRightFade
							? FADE_RIGHT
							: 'none';

			setMask({ node, mask });
		};

		const resizeObserver = new ResizeObserver(update);

		const handleMediaChange = (): void => update();

		node.addEventListener('scroll', update, { passive: true });

		resizeObserver.observe(node);

		mediaQuery.addEventListener('change', handleMediaChange);

		update();

		return {
			destroy: () => {
				node.removeEventListener('scroll', update);

				resizeObserver.disconnect();

				mediaQuery.removeEventListener('change', handleMediaChange);
			}
		};
	};
</script>

<div
	class="scrollable-bar flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible"
	use:scrollFade
>
	{@render children()}
</div>

<style lang="scss">
	.scrollable-bar {
		scrollbar-width: none;
	}
</style>
