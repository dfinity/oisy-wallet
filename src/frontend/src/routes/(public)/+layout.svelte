<script lang="ts">
	import type { Snippet } from 'svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<header
	class="z-1 pointer-events-none relative flex w-full max-w-screen-2.5xl items-center justify-between px-4 pt-6 md:px-8 1.5lg:fixed 1.5lg:inset-x-0 1.5lg:top-0 1.5lg:z-10"
>
	<div class="pointer-events-auto">
		<OisyWalletLogoLink />
	</div>
</header>

<main
	class="mx-0 mt-10 flex flex-col items-center justify-center px-8 pb-10 lg:mx-auto lg:w-md lg:px-0 1.5lg:mt-28"
>
	{@render children()}
</main>
