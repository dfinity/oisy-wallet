<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AiAssistantReviewSendTokenTool from '$lib/components/ai-assistant/AiAssistantReviewSendTokenTool.svelte';
	import AiAssistantShowContactsTool from '$lib/components/ai-assistant/AiAssistantShowContactsTool.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
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
		{:else if type === 'review_send_tokens' && nonNullish(result) && 'token' in result}
			<SendTokenContext token={result.token}>
				<AiAssistantReviewSendTokenTool {...result} />
			</SendTokenContext>
		{/if}
	{/each}
</div>
