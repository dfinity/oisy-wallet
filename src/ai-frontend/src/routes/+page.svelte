<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import AiAssistantChat from '$lib/components/ai-assistant/AiAssistantChat.svelte';
	import AiAssistantResetButton from '$lib/components/ai-assistant/AiAssistantResetButton.svelte';
	import IconAiAssistant from '$lib/components/icons/IconAiAssistant.svelte';
	import IconAstronautArrow from '$lib/components/icons/icon-astronaut/IconAstronautArrow.svelte';
	import Loaders from '$lib/components/loaders/Loaders.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { signIn } from '$lib/services/auth.services';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { InternetIdentityDomain } from '$lib/types/auth';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	onMount(() => {
		aiAssistantStore.open();
	});

	$effect(() => {
		if ($authSignedIn) {
			aiAssistantStore.open();
		}
	});

	const onAuthenticate = async () => {
		await signIn({
			domain: InternetIdentityDomain.VERSION_2_0
		});
	};
</script>

{#if $authNotSignedIn}
	<div class="flex min-h-dvh flex-col items-center justify-center px-6" in:fade>
		<div class="flex flex-col items-center gap-8 text-center">
			<div class="flex items-center gap-3">
				<IconAiAssistant size="48" />
				<h1 class="text-4xl font-bold">
					{replaceOisyPlaceholders($i18n.ai_assistant.text.title)}
				</h1>
			</div>

			<p class="max-w-md text-lg text-secondary">
				{$i18n.ai_assistant.text.welcome_message}
			</p>

			<ButtonAuthenticate
				onclick={onAuthenticate}
				styleClass="bg-brand-primary text-primary-inverted"
			>
				{$i18n.auth.text.authenticate}
				<IconAstronautArrow />
			</ButtonAuthenticate>
		</div>
	</div>
{:else if $authSignedIn}
	<Loaders>
		<div class="fixed inset-0 mx-auto flex max-w-3xl flex-col bg-primary" in:fade>
			<div class="flex items-center justify-end px-4 py-2">
				<AiAssistantResetButton />
			</div>

			<AiAssistantChat />
		</div>
	</Loaders>
{/if}
