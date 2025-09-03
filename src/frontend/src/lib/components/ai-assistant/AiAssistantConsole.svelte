<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import AiAssistantActionButton from '$lib/components/ai-assistant/AiAssistantActionButton.svelte';
	import AiAssistantForm from '$lib/components/ai-assistant/AiAssistantForm.svelte';
	import AiAssistantMessages from '$lib/components/ai-assistant/AiAssistantMessages.svelte';
	import IconOisy from '$lib/components/icons/IconOisy.svelte';
	import IconRepeat from '$lib/components/icons/IconRepeat.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import IconlySend from '$lib/components/icons/iconly/IconlySend.svelte';
	import {
		AI_ASSISTANT_MESSAGE_FAILED_TO_BE_PARSED,
		AI_ASSISTANT_MESSAGE_SENT
	} from '$lib/constants/analytics.contants';
	import {
		aiAssistantLlmMessages,
		aiAssistantChatMessages
	} from '$lib/derived/ai-assistant.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { askLlm } from '$lib/services/ai-assistant.services';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ChatMessage } from '$lib/types/ai-assistant';
	import { generateAiAssistantResponseEventMetadata } from '$lib/utils/ai-assistant.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	let userInput = $state('');
	let loading = $state(false);
	let disabled = $derived(loading || isNullishOrEmpty(userInput));
	let messagesContainer: HTMLDivElement | undefined;
	let shouldScrollMessagesContainer = $state(true);

	let messagesToDisplay = $derived(
		$aiAssistantChatMessages.reduce<ChatMessage[]>(
			(acc, { data, role }) => [...acc, ...(role !== 'system' ? [{ role, data }] : [])],
			[]
		)
	);

	const handleMessagesContainerScroll = () => {
		if (isNullish(messagesContainer)) {
			return;
		}

		// 10 - a small tolerance in scroll measurements
		shouldScrollMessagesContainer =
			messagesContainer.scrollTop + messagesContainer.clientHeight >=
			messagesContainer.scrollHeight - 10;
	};

	$effect(() => {
		// add messages as a dependency to trigger the scroll when new content arrives
		messagesToDisplay;

		if (nonNullish(messagesContainer) && shouldScrollMessagesContainer) {
			messagesContainer.scrollTo({
				top: messagesContainer.scrollHeight,
				behavior: 'smooth'
			});
		}
	});

	const sendMessage = async ({
		messageText,
		context
	}: {
		messageText: string;
		context?: string;
	}) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		aiAssistantStore.appendMessage({
			role: 'user',
			data: { text: messageText, context }
		});

		const requestStartTimestamp = Date.now();

		try {
			shouldScrollMessagesContainer = true;
			loading = true;

			trackEvent({ name: AI_ASSISTANT_MESSAGE_SENT });

			const { text, tool } = await askLlm({
				messages: $aiAssistantLlmMessages,
				identity: $authIdentity
			});

			aiAssistantStore.appendMessage({
				role: 'assistant',
				data:
					(tool?.calls ?? []).length > 0 && (tool?.results ?? []).length > 0
						? {
								tool
							}
						: {
								text: isNullishOrEmpty(text) ? $i18n.ai_assistant.errors.no_response : text
							}
			});
		} catch (err: unknown) {
			console.error($i18n.ai_assistant.errors.unknown, err);

			aiAssistantStore.appendMessage({
				role: 'assistant',
				data: {
					text: $i18n.ai_assistant.errors.unknown
				}
			});

			trackEvent({
				name: AI_ASSISTANT_MESSAGE_FAILED_TO_BE_PARSED,
				metadata: generateAiAssistantResponseEventMetadata({ requestStartTimestamp })
			});
		}

		loading = false;
	};

	const onMessageSubmit = async () => {
		if (loading) {
			return;
		}

		const nextMessage = userInput;
		userInput = '';

		await sendMessage({ messageText: nextMessage });
	};
</script>

<div
	class="pointer-events-auto fixed bottom-0 right-0 flex h-full min-h-full w-full flex-col justify-between rounded-2xl bg-primary md:bottom-6 md:right-8 md:h-[calc(100vh-7.25rem)] md:min-h-[25rem] md:w-[22.5rem]"
	transition:fade
>
	<div class="border-b-1 flex items-center justify-between border-brand-subtle-10 px-4 py-2">
		<IconOisy size="36" />

		<h5 class="mx-2 w-full">{replaceOisyPlaceholders($i18n.ai_assistant.text.title)}</h5>

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

		<button
			class="text-tertiary transition-colors hover:text-primary"
			aria-label={$i18n.core.text.close}
			onclick={aiAssistantStore.close}
		>
			<IconClose />
		</button>
	</div>

	<div
		bind:this={messagesContainer}
		class="h-full overflow-y-auto overflow-x-hidden px-4 py-6"
		onscroll={handleMessagesContainerScroll}
	>
		{#if !loading && messagesToDisplay.length <= 0}
			<div in:fade>
				<h4 class="text-brand-primary">
					{$i18n.ai_assistant.text.welcome_message}
				</h4>
				<div class="my-6">
					<AiAssistantActionButton
						onClick={() => {
							sendMessage({ messageText: $i18n.ai_assistant.text.action_button_contacts_prompt });
						}}
						subtitle={$i18n.ai_assistant.text.action_button_contacts_subtitle}
						title={$i18n.ai_assistant.text.action_button_contacts_title}
					>
						{#snippet icon()}
							<IconSend />
						{/snippet}
					</AiAssistantActionButton>
					<AiAssistantActionButton
						onClick={() => {
							sendMessage({
								messageText: $i18n.ai_assistant.text.action_button_send_tokens_prompt
							});
						}}
						subtitle={$i18n.ai_assistant.text.action_button_send_tokens_subtitle}
						title={$i18n.ai_assistant.text.action_button_send_tokens_title}
					>
						{#snippet icon()}
							<IconlySend />
						{/snippet}
					</AiAssistantActionButton>
				</div>
			</div>
		{:else}
			<div in:fade>
				<AiAssistantMessages {loading} messages={messagesToDisplay} onSendMessage={sendMessage} />
			</div>
		{/if}
	</div>

	<AiAssistantForm {disabled} {onMessageSubmit} bind:value={userInput} />
</div>
