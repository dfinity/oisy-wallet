<script lang="ts">
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
</script>

<header
	class="1.5lg:inset-x-0 1.5lg:top-0 px-4 pt-6 md:px-8 pointer-events-none relative z-1 flex w-full max-w-screen-2.5xl items-center justify-between 1.5lg:fixed 1.5lg:z-10"
>
	<div class="pointer-events-auto">
		<OisyWalletLogoLink />
	</div>
</header>

<main
	class="1.5lg:mt-28 mx-0 mt-10 px-8 pb-10 lg:px-0 flex flex-col items-center justify-center lg:mx-auto lg:w-md"
>
	<slot />
</main>
