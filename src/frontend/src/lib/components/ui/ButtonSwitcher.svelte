<script lang="ts">
	import DropdownButton from '$lib/components/ui/DropdownButton.svelte';

	export let disabled = false;
	export let button: HTMLButtonElement | undefined = undefined;
	export let ariaLabel: string;
</script>

<DropdownButton bind:button on:click {ariaLabel} {disabled}>
	<slot />
</DropdownButton>
