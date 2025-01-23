<script lang="ts">
	export let ref: undefined | string = undefined;
	export let element: 'p' | 'div' = 'p';
</script>

<label for={ref} class="px-4.5 font-bold"><slot name="label" />:</label>
<svelte:element this={element} id={ref} class="mb-4 px-4.5 font-normal break-all"
	><slot /></svelte:element
>
