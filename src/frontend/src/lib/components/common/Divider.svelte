<script lang="ts">
	export interface Props {
		variant?: 'dot';
	}
	const { variant = 'dot' }: Props = $props();
</script>

{#if variant === 'dot'}
	<span class="mx-[0.75em] -mt-[0.35em] inline-block h-full align-middle text-[0.6em] font-bold"
		>•</span
	>
{/if}
