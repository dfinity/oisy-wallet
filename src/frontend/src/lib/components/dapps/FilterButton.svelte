<script lang="ts">
	export let label: string;
	export let isActive: boolean = false;
</script>

<button
	on:click
	class="px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300"
	class:bg-blue-ribbon={isActive}
	class:text-white={isActive}
>
	{label}
</button>
