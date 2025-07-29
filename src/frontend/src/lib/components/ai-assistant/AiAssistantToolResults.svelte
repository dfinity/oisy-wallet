<script lang="ts">
	import AiAssistantShowContactsTool from '$lib/components/ai-assistant/AiAssistantShowContactsTool.svelte';
	import type { ToolResult } from '$lib/types/ai-assistant';

	interface Props {
		results: ToolResult[];
	}

	let { results }: Props = $props();
</script>

<div class="mb-5">
	{#each results as { result, type }, index (index)}
		{#if type === 'show_contacts'}
			<AiAssistantShowContactsTool contacts={result} />
		{/if}
	{/each}
</div>
