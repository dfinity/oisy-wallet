<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import Hero from '$lib/components/dashboard/Hero.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
</script>

<Listener>
	<Hero />

	<main>
		<Loader>
			<slot />
		</Loader>
	</main>
</Listener>
