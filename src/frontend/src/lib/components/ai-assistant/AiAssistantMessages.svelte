<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import AiAssistantBotMessage from '$lib/components/ai-assistant/AiAssistantBotMessage.svelte';
	import AiAssistantToolResults from '$lib/components/ai-assistant/AiAssistantToolResults.svelte';
	import AiAssistantUserMessage from '$lib/components/ai-assistant/AiAssistantUserMessage.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ChatMessage } from '$lib/types/ai-assistant';

	interface Props {
		messages: ChatMessage[];
		loading: boolean;
		onSendMessage: (params: { messageText?: string; context?: string }) => Promise<void>;
		onRetry: () => Promise<void>;
	}

	let { messages, loading, onSendMessage, onRetry }: Props = $props();
</script>

{#each messages as message, index (index)}
	<div in:fade>
		{#if message.role === 'user' && nonNullish(message.data.text)}
			<AiAssistantUserMessage content={message.data.text} />
		{:else if message.role === 'assistant' && nonNullish(message.data.text)}
			<AiAssistantBotMessage
				content={message.data.text}
				isLastItem={messages.length - 1 === index}
				{onRetry}
				retryable={message.data.retryable}
			/>
		{:else if message.role === 'assistant' && nonNullish(message.data.tool?.results)}
			<AiAssistantToolResults
				isLastItem={messages.length - 1 === index}
				{onSendMessage}
				results={message.data.tool.results}
			/>
		{/if}
	</div>
{/each}

{#if loading}
	<div class="animate-pulse text-sm" in:fade>{$i18n.ai_assistant.text.loading}</div>
{/if}
