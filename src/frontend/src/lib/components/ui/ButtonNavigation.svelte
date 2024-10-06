<script lang="ts">
	export let selected = false;
	export let ariaLabel: string;
</script>

<button
	class="flex w-full min-w-0 flex-col p-4 no-underline sm:min-w-[70px]"
	class:font-bold={selected}
	class:bg-[var(--color-primary)]={selected}
	class:text-white={selected}
	aria-label={ariaLabel}
	on:click
>
	<slot name="icon" size />
	<div class="hidden sm:block">
		<slot />
	</div>
</button>
