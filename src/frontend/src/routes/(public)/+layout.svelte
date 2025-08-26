<script lang="ts">
	import type { Snippet } from 'svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<header
	class="z-1 pointer-events-none relative flex w-full max-w-screen-2.5xl items-start justify-between px-4 pt-6 md:px-8 1.5lg:fixed 1.5lg:inset-x-0 1.5lg:top-0 1.5lg:z-10"
>
	<div class="pointer-events-auto flex w-fit items-center gap-0 no-underline">
		<OisyWalletLogo />
	</div>
</header>

<main
	class="mx-0 mt-10 flex flex-col items-start justify-center px-8 pb-10 lg:mx-auto lg:w-sm lg:px-0 2xl:w-md 1.5lg:mt-28"
>
	{@render children()}
</main>

<style lang="scss">
	:global {
		main h3 {
			font-size: clamp(1rem, 1rem + 1vw, 1.5rem);
			line-height: clamp(1.5rem, 1rem + 1vw, 2.5rem);

			margin-bottom: calc(var(--spacing) * clamp(2, 3, 4));
			margin-top: calc(var(--spacing) * clamp(4, 6, 8));
		}

		main p {
			font-size: clamp(0.5rem, 0.5rem + 1vw, 1rem);
			line-height: clamp(1rem, 1rem + 1vw, 1.75rem);
			margin-bottom: calc(var(--spacing) * clamp(4, 6, 8));
		}

		ul {
			padding-inline-start: calc(var(--spacing) * 4);

			li {
				list-style: disc;
			}
		}

		a {
			color: var(--color-foreground-brand-primary);
		}
	}
</style>
