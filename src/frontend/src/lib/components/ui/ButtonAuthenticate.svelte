<script>
	import IconArrowAstronaut from '$lib/components/icons/IconArrowAstronaut.svelte';
</script>

<button
	on:click
	class="h-16 px-8 py-2 rounded-full gap-4 font-bold text-lg"
	data-tid="login-button"
>
	<slot />
	<IconArrowAstronaut />
</button>

<style lang="scss">
	button {
		background: #016dfc;
		padding: 1.5em 2em;
		background: linear-gradient(
			90deg,
			#0975ff 0%,
			#0975ff 24.86%,
			#1bb5ff 30.32%,
			#03e2ff 50.17%,
			#1bb5ff 70.25%,
			#0874ff 75.12%,
			#0874ff 100%
		);
		background-size: 600% 100%;
		background-position: 0 0;
		transition:
			background-position 0.7s ease-in-out,
			box-shadow 0.5s ease-in-out;
	}

	button:hover {
		background-position: 100% 0;
		box-shadow: 0 0 50px #1bb5ff;
	}
</style>
