<script lang="ts">
	export let ref: undefined | string = undefined;
	export let element: 'p' | 'div' = 'p';
</script>

<label for={ref} class="font-bold px-4.5"><slot name="label" />:</label>
<svelte:element this={element} id={ref} class="mb-4 font-normal px-4.5 break-all"
	><slot /></svelte:element
>
