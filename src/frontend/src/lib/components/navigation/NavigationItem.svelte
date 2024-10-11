<script lang="ts">
	export let selected = false;
	export let ariaLabel: string;
</script>

<button
	class="w-full rounded-xl p-3 text-left hover:text-blue-ribbon"
	class:text-blue-ribbon={selected}
	class:bg-white={selected}
	class:hover:bg-onahau={selected}
	aria-label={ariaLabel}
	on:click
>
	<slot />
</button>
