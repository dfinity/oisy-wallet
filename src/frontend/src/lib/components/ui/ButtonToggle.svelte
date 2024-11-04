<script lang="ts">
	export let active = false;
</script>

<button
	class="flex gap-1 rounded-xl px-3 py-2 shadow transition-colors duration-700"
	class:bg-white={!active}
	class:hover:text-foreground-brand-primary={!active}
	class:active:text-foreground-brand-primary={!active}
	class:bg-background-brand-primary={active}
	class:text-white={active}
	class:hover:bg-cobalt={active}
	class:active:bg-cobalt={active}
	on:click
>
	<slot />
</button>
