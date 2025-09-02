<script lang="ts">
	import IconSendMessage from '$lib/components/icons/IconSendMessage.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { AI_ASSISTANT_SEND_MESSAGE_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { isDesktop } from '$lib/utils/device.utils';

	interface Props {
		value: string;
		onMessageSubmit: () => void;
		disabled: boolean;
	}

	let { onMessageSubmit, disabled, value = $bindable() }: Props = $props();

	const onSubmit = (event: Event) => {
		event.preventDefault();

		onMessageSubmit();
	};
</script>

<div class="border-t border-secondary px-4 py-3 pb-4 text-xs">
	<form method="POST" onsubmit={onSubmit}>
		<InputText
			name="message" 
			autofocus={isDesktop()}
			placeholder={$i18n.ai_assistant.text.send_message_input_placeholder}
			bind:value
		>
			{#snippet innerEnd()}
				<button
					class="rounded-md bg-secondary p-1 text-disabled transition"
					class:hover:bg-brand-primary={!disabled}
					class:hover:text-primary-inverted={!disabled}
					aria-label={$i18n.ai_assistant.text.send_message}
					data-tid={AI_ASSISTANT_SEND_MESSAGE_BUTTON}
					{disabled}
					type="submit"
				>
					<IconSendMessage size="20" />
				</button>
			{/snippet}
		</InputText>
	</form>
</div>
