<script lang="ts">
	export let label: string;
	export let selected: boolean;
	export let tabindex: number;
</script>

<div
	class="mr-4 cursor-pointer"
	on:click
	on:keydown
	role="radio"
	aria-checked={selected}
	{tabindex}
>
	<div
		class="duration-250 mb-2 rounded-xl border-4 transition-all sm:rounded-2xl"
		class:border-brand-primary={selected}
		class:border-transparent={!selected}
	>
		<div class="relative overflow-hidden rounded-lg shadow sm:rounded-xl">
			<slot />

			<span
				class="absolute bottom-2 right-2 rounded-full border-4 p-1 shadow"
				class:border-brand-primary={selected}
				class:border-page={!selected}
				class:bg-white={selected}
				class:bg-page={!selected}
			></span>
		</div>
	</div>
	<div class="text-primary text-center">{label}</div>
</div>
