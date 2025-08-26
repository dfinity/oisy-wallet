<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AiAssistantShowContactsTool from '$lib/components/ai-assistant/AiAssistantShowContactsTool.svelte';
	import type { ToolResult } from '$lib/types/ai-assistant';

	interface Props {
		results: ToolResult[];
		onSendMessage: (params: { messageText: string; context?: string }) => Promise<void>;
	}

	let { results, onSendMessage }: Props = $props();
</script>

<div class="mb-5">
	{#each results as { result, type }, index (index)}
		{#if type === 'show_contacts' && nonNullish(result) && 'contacts' in result}
			<AiAssistantShowContactsTool {...result} {onSendMessage} />
		{/if}
	{/each}
</div>
