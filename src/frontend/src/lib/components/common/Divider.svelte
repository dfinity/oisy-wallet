<script lang="ts">
	export interface Props {
		variant?: 'dot';
	}

	const { variant = 'dot' }: Props = $props();
</script>

{#if variant === 'dot'}
	<svg
		width="4px"
		height="4px"
		viewBox="0 0 20 20"
		xmlns="http://www.w3.org/2000/svg"
		stroke="currentColor"><circle r="8" cx="10" cy="10" fill="currentColor" /></svg
	>
{/if}
