<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import Hero from '$lib/hero/Hero.svelte';
</script>

<Listener>
	<Hero />

	<main>
		<Loader>
			<slot />
		</Loader>
	</main>
</Listener>
