<script lang="ts">
	export let label: string;
	export let selected: boolean;
	export let tabindex: number;
	export let testId: string | undefined = undefined;
</script>

<div
	class="mr-4 cursor-pointer"
	on:click
	on:keydown
	role="radio"
	aria-checked={selected}
	{tabindex}
	data-tid={testId}
>
	<div
		class="mb-2 rounded-xl sm:rounded-2xl border-4 transition-all duration-250"
		class:border-brand-primary={selected}
		class:border-transparent={!selected}
	>
		<div class="rounded-lg shadow-sm sm:rounded-xl relative overflow-hidden">
			<slot />

			<span
				class="right-2 bottom-2 p-1 shadow-sm absolute rounded-full border-4"
				class:border-brand-primary={selected}
				class:border-page={!selected}
				class:bg-off-white={selected}
				class:bg-primary={!selected}
			></span>
		</div>
	</div>
	<div class="text-center text-primary">{label}</div>
</div>
