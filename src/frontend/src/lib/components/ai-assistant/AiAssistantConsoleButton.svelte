<script lang="ts">
	import { AI_ASSISTANT_CONSOLE_ENABLED } from '$env/ai-assistant.env';
	import IconOisy from '$lib/components/icons/IconOisy.svelte';
	import { AI_ASSISTANT_CONSOLE_BUTTON } from '$lib/constants/test-ids.constants';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		size?: string;
		styleClass?: string;
	}
	let { size = '80', styleClass }: Props = $props();
</script>

{#if $authSignedIn && AI_ASSISTANT_CONSOLE_ENABLED}
	<button
		style={`width: ${size}px; height: ${size}px;`}
		class={`group flex items-center justify-center overflow-hidden rounded-full bg-primary duration-500 ${styleClass ?? ''}`}
		aria-label={replaceOisyPlaceholders($i18n.footer.text.ai_assistant_console_button)}
		data-tid={AI_ASSISTANT_CONSOLE_BUTTON}
		onclick={() => aiAssistantStore.open()}
	>
		<IconOisy {size} styleClass="group-hover:rotate-10 transition group-hover:scale-[1.10]" />
	</button>
{/if}
