<script lang="ts">
	import { fade } from 'svelte/transition';
	import AiAssistantBotMessage from '$lib/components/ai-assistant/AiAssistantBotMessage.svelte';
	import AiAssistantUserMessage from '$lib/components/ai-assistant/AiAssistantUserMessage.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ChatMessage } from '$lib/types/ai-assistant';

	interface Props {
		messages: ChatMessage[];
		loading: boolean;
	}

	let { messages, loading }: Props = $props();
</script>

{#each messages as message, index (index)}
	<div in:fade>
		{#if message.role === 'user'}
			<AiAssistantUserMessage content={message.content} />
		{:else if message.role === 'assistant'}
			<AiAssistantBotMessage content={message.content} />
		{/if}
	</div>
{/each}

{#if loading}
	<div class="text-sm" in:fade>{$i18n.ai_assistant.text.loading}</div>
{/if}
