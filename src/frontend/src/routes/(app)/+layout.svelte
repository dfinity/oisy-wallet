<script lang="ts">
	import Loader from '$lib/components/core/Loader.svelte';
	import Hero from '$lib/hero/Hero.svelte';
</script>

<Hero />

<main>
	<Loader>
		<slot />
	</Loader>
</main>
