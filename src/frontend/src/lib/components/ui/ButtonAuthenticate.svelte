<script lang="ts">
	import IconArrowAstronaut from '$lib/components/icons/IconArrowAstronaut.svelte';
</script>

<button
	on:click
	class="bg-[var(--color-primary)] flex w-full items-center justify-center gap-4 rounded-2xl py-3 text-lg font-bold leading-6 text-white sm:w-80 sm:px-12"
	data-tid="login-button"
>
	<slot />
	<IconArrowAstronaut />
</button>
