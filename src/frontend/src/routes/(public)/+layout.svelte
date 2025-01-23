<script lang="ts">
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
</script>

<header
	class="max-w-screen-2.5xl 1.5lg:fixed 1.5lg:inset-x-0 1.5lg:top-0 1.5lg:z-10 pointer-events-none relative z-1 flex w-full items-center justify-between px-4 pt-6 md:px-8"
>
	<div class="pointer-events-auto">
		<OisyWalletLogoLink />
	</div>
</header>

<main
	class="1.5lg:mt-28 mx-0 mt-10 flex flex-col items-center justify-center px-8 pb-10 lg:mx-auto lg:w-md lg:px-0"
>
	<slot />
</main>
