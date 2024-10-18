<script lang="ts">
	import { draw } from 'svelte/transition';

	export let checked: boolean;
	export let testId: string | undefined = undefined;
</script>

<label class="flex cursor-pointer items-center gap-3">
	<div class="relative flex size-fit items-center">
		<input
			type="checkbox"
			class="peer relative size-5 appearance-none rounded border border-light-grey bg-white checked:border-0 checked:bg-blue-ribbon hover:border-blue-ribbon checked:hover:bg-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-ribbon focus-visible:ring-offset-2"
			bind:checked
			on:click
			data-tid={testId}
		/>
		{#if checked}
			<svg
				class="pointer-events-none absolute inset-0 m-0.5 hidden size-4 stroke-white outline-none peer-checked:block"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline in:draw={{ duration: 800 }} points="4 12 9 17 19 7" />
			</svg>
		{/if}
	</div>
	<slot />
</label>
