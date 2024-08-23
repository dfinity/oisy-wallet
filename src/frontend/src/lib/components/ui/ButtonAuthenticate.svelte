<script lang="ts">
	import IconArrowAstronaut from '$lib/components/icons/IconArrowAstronaut.svelte';
</script>

<div class="rounded-full border-overlay">
	<button
		on:click
		class="h-[72px] px-[74px] py-2 rounded-full border-0 gap-4 font-bold text-lg leading-6 bg-brandeis-blue"
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

	button {
		position: relative;
		z-index: 0;
		//border: solid 4px rgba(7, 22, 137, 0.15);
		transition: border-color 0.5s ease-in-out;
	}

	button::before {
		border-radius: 9999px;
		position: absolute;
		content: '';
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: -1;
		background: radial-gradient(49.28% 49.28% at 50% 100%, #59e7d6 0%, #147bff 100%);
		opacity: 0.6;
		box-shadow:
			0 2px 8px 0 rgba(255, 255, 255, 0.35) inset,
			0 4px 16px 0 rgba(0, 0, 0, 0.25);
		transition:
			opacity 0.5s ease-in-out,
			box-shadow 0.5s ease-in-out;
	}

	button:hover::before {
		opacity: 1;
		box-shadow:
			0 2px 8px 0 rgba(255, 255, 255, 0.75) inset,
			0 4px 16px 0 rgba(0, 0, 0, 0.25);
	}
</style>
