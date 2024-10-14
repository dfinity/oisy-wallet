<script lang="ts">
	export let label: string;
	export let isActive: boolean = false;
</script>

<button
	on:click
	class="rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300"
	class:bg-blue-ribbon={isActive}
	class:text-white={isActive}
>
	{label}
</button>
