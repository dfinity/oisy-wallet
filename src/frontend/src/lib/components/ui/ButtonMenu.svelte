<script lang="ts">
	export let ariaLabel: string;
</script>

<button
	class="flex gap-2 items-center no-underline hover:text-blue active:text-blue w-full"
	aria-label={ariaLabel}
	on:click
>
	<slot></slot>
</button>
