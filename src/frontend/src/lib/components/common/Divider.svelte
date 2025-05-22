<script lang="ts">
	export interface Props {
		variant?: 'dot';
	}

	const { variant = 'dot' }: Props = $props();
</script>

{#if variant === 'dot'}
	<svg
		fill="currentColor"
		width="8px"
		height="8px"
		viewBox="0 0 20 20"
		xmlns="http://www.w3.org/2000/svg"
		stroke="currentColor"
		><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g
			><path d="M7.8 10a2.2 2.2 0 0 0 4.4 0 2.2 2.2 0 0 0-4.4 0z"></path></g
		></svg
	>
{/if}
