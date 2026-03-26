<script lang="ts">
	import IconRepeat from '$lib/components/icons/IconRepeat.svelte';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<button
	class="text-tertiary transition-colors hover:text-primary"
	aria-label={$i18n.ai_assistant.text.reset_chat_history}
	onclick={aiAssistantStore.resetChatHistory}
>
	<IconRepeat size="18" />
</button>
