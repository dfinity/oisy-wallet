<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Action } from 'svelte/action';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	type FadeState = 'none' | 'left' | 'right' | 'both';

	const setFadeState = ({
		node,
		fadeState
	}: {
		node: HTMLDivElement;
		fadeState: FadeState;
	}): void => {
		node.setAttribute('data-fade', fadeState);
	};

	const scrollFade: Action<HTMLDivElement, undefined> = (node) => {
		const threshold = 2;
		const mediaQuery = window.matchMedia('(min-width: 768px)');

		const update = (): void => {
			if (mediaQuery.matches) {
				setFadeState({ node, fadeState: 'none' });

				return;
			}

			const { scrollLeft, scrollWidth, clientWidth } = node;
			const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);

			const hasLeftFade = scrollLeft > threshold;
			const hasRightFade = scrollLeft < maxScrollLeft - threshold;

			const fadeState: FadeState =
				hasLeftFade && hasRightFade
					? 'both'
					: hasLeftFade
						? 'left'
						: hasRightFade
							? 'right'
							: 'none';

			setFadeState({ node, fadeState });
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
	data-fade="none"
	use:scrollFade
>
	{@render children()}
</div>

<style lang="scss">
	.scrollable-bar {
		scrollbar-width: none;
	}

	.scrollable-bar::-webkit-scrollbar {
		display: none;
	}

	.scrollable-bar[data-fade='both'] {
		-webkit-mask-image: linear-gradient(
			to right,
			transparent,
			black 40px,
			black calc(100% - 40px),
			transparent
		);

		mask-image: linear-gradient(
			to right,
			transparent,
			black 40px,
			black calc(100% - 40px),
			transparent
		);
	}

	.scrollable-bar[data-fade='left'] {
		-webkit-mask-image: linear-gradient(to right, transparent, black 40px);

		mask-image: linear-gradient(to right, transparent, black 40px);
	}

	.scrollable-bar[data-fade='right'] {
		-webkit-mask-image: linear-gradient(to right, black calc(100% - 40px), transparent);
		mask-image: linear-gradient(to right, black calc(100% - 40px), transparent);
	}

	.scrollable-bar[data-fade='none'] {
		-webkit-mask-image: none;
		mask-image: none;
	}
</style>
