<script lang="ts">
	import IconRepeat from '$lib/components/icons/IconRepeat.svelte';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		loading?: boolean;
	}

	let { loading = false }: Props = $props();
</script>

<button
	class="mr-2 transition-colors"
	class:hover:text-primary={!loading}
	class:text-tertiary={!loading}
	class:text-tertiary-inverted={loading}
	aria-label={$i18n.ai_assistant.text.reset_chat_history}
	disabled={loading}
	onclick={aiAssistantStore.resetChatHistory}
>
	<IconRepeat size="18" />
</button>
