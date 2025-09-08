<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AiAssistantReviewSendTokenTool from '$lib/components/ai-assistant/AiAssistantReviewSendTokenTool.svelte';
	import AiAssistantShowContactsTool from '$lib/components/ai-assistant/AiAssistantShowContactsTool.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import { type ToolResult, ToolResultType } from '$lib/types/ai-assistant';

	interface Props {
		results: ToolResult[];
		onSendMessage: (params: { messageText: string; context?: string }) => Promise<void>;
		isLastItem: boolean;
	}

	let { results, onSendMessage, isLastItem }: Props = $props();
</script>

<div class="mb-5">
	{#each results as { result, type }, index (index)}
		{#if type === ToolResultType.SHOW_CONTACTS && nonNullish(result) && 'contacts' in result}
			<AiAssistantShowContactsTool {...result} {onSendMessage} />
		{:else if type === ToolResultType.REVIEW_SEND_TOKENS && nonNullish(result) && 'token' in result}
			<SendTokenContext token={result.token}>
				<AiAssistantReviewSendTokenTool
					{...result}
					sendEnabled={isLastItem && results.length - 1 === index}
				/>
			</SendTokenContext>
		{/if}
	{/each}
</div>
