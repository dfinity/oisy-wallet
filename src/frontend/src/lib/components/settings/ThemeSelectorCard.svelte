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
		class="duration-250 mb-2 rounded-xl border-4 transition-all sm:rounded-2xl"
		class:border-brand-primary={selected}
		class:border-transparent={!selected}
	>
		<div class="relative overflow-hidden rounded-lg shadow-sm sm:rounded-xl">
			<slot />

			<span
				class="absolute bottom-2 right-2 rounded-full border-4 p-1 shadow-sm"
				class:border-brand-primary={selected}
				class:bg-off-white={selected}
				class:border-primary-inverted={!selected}
				class:bg-primary={!selected}
			></span>
		</div>
	</div>
	<div class="text-center text-primary">{label}</div>
</div>
