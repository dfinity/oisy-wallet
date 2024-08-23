<script lang="ts">
	import IconArrowAstronaut from '$lib/components/icons/IconArrowAstronaut.svelte';
</script>

<!-- This overlay is needed, otherwise the border opacity would show the gradient instead of the background. -->
<div class="rounded-full border-overlay">
	<button
		on:click
		class="authenticate h-[72px] px-[74px] py-2 rounded-full border-0 gap-4 font-bold text-lg leading-6 bg-brandeis-blue"
		data-tid="login-button"
	>
		<slot />
		<IconArrowAstronaut />
	</button>
</div>

<style lang="scss">
	.border-overlay {
		border: solid 4px rgba(7, 22, 137, 0.15);
		transition: border-color 0.5s ease-in-out;
	}

	.border-overlay:hover {
		border-color: rgba(7, 22, 137, 0.25);
	}
</style>
