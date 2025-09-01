<script lang="ts">
	import { AI_ASSISTANT_CONSOLE_ENABLED } from '$env/ai-assistant.env';
	import AnimatedIconAiAssistant from '$lib/components/icons/animated/AnimatedIconAiAssistant.svelte';
	import { AI_ASSISTANT_OPEN_CONSOLE } from '$lib/constants/analytics.contants';
	import { AI_ASSISTANT_CONSOLE_BUTTON } from '$lib/constants/test-ids.constants';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		styleClass?: string;
	}

	let { styleClass }: Props = $props();

	const onClick = () => {
		aiAssistantStore.open();

		trackEvent({ name: AI_ASSISTANT_OPEN_CONSOLE });
	};
</script>

{#if $authSignedIn && AI_ASSISTANT_CONSOLE_ENABLED}
	<button
		class={`group flex items-center justify-center overflow-hidden duration-500 ${styleClass ?? ''}`}
		aria-label={replaceOisyPlaceholders($i18n.footer.text.ai_assistant_console_button)}
		data-tid={AI_ASSISTANT_CONSOLE_BUTTON}
		onclick={onClick}
	>
		<AnimatedIconAiAssistant styleClass="transition group-hover:scale-[1.10]" />
	</button>
{/if}
