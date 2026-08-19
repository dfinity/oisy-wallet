<script lang="ts">
	import { fade } from 'svelte/transition';
	import AiAssistantChat from '$lib/components/ai-assistant/AiAssistantChat.svelte';
	import AiAssistantResetButton from '$lib/components/ai-assistant/AiAssistantResetButton.svelte';
	import IconAiAssistant from '$lib/components/icons/IconAiAssistant.svelte';
	import IconCloseThin from '$lib/components/icons/IconCloseThin.svelte';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { bottomSheetOpenStore } from '$lib/stores/ui.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let loading = $state(false);

	// On mobile the console is a full-screen takeover, but it lives inside the
	// footer's low stacking context while the bottom nav bar sits at a higher
	// z-index — so the nav would paint over the console's input row. The nav
	// already hides itself while a bottom sheet is open; reuse that mechanism
	// for the console's lifetime (this component only mounts while it is open).
	$effect(() => {
		bottomSheetOpenStore.set(true);
		return () => bottomSheetOpenStore.set(false);
	});
</script>

<div
	class="pointer-events-auto fixed right-0 bottom-0 flex h-full min-h-full w-full flex-col justify-between rounded-2xl bg-primary md:right-8 md:bottom-6 md:h-[calc(100vh-7.25rem)] md:min-h-[25rem] md:w-[22.5rem]"
	transition:fade
>
	<div class="flex items-center justify-between border-b-1 border-brand-subtle-10 px-4 py-2">
		<IconAiAssistant />

		<h5 class="mx-2 w-full">{replaceOisyPlaceholders($i18n.ai_assistant.text.title)}</h5>

		<div class="mr-2">
			<AiAssistantResetButton {loading} />
		</div>

		<button
			class="text-tertiary transition-colors hover:text-primary"
			aria-label={$i18n.core.text.close}
			onclick={aiAssistantStore.close}
		>
			<IconCloseThin />
		</button>
	</div>

	<AiAssistantChat bind:loading />
</div>
