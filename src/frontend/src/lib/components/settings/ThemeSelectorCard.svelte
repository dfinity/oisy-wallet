<script lang="ts">
	export let label: string;
	export let selected: boolean;
	export let tabindex: string;
</script>

<div class="mr-4 cursor-pointer" on:click role="radio" aria-checked={selected} tabindex={tabindex}>
	<div class="mb-2 rounded-xl sm:rounded-2xl transition-all duration-250 border-4" class:border-primary={selected} class:border-transparent={!selected}>
		<div class="relative shadow rounded-lg sm:rounded-xl overflow-hidden">
			<slot />

			<span class="absolute rounded-full border-4 p-1 bg-white bottom-2 right-2 shadow" class:border-primary={selected} class:border-white={!selected}></span>
		</div>
	</div>
	<div class="text-center text-primary">{label}</div>
</div>
