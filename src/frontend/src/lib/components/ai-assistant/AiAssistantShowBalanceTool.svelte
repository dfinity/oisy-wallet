<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import AiAssistantShowBalanceToolCard from '$lib/components/ai-assistant/AiAssistantShowBalanceToolCard.svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ShowBalanceToolResult } from '$lib/types/ai-assistant';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props extends ShowBalanceToolResult {
		onSendMessage: (params: { messageText?: string; context?: string }) => Promise<void>;
		loading: boolean;
	}

	let { mainCard, secondaryCards, onSendMessage, loading }: Props = $props();

	let { token: mainCardToken, network: mainCardNetwork } = $derived(mainCard);

	let mainCardMessageParams = $derived(
		nonNullish(mainCardToken) && (nonNullish(mainCardNetwork) || (secondaryCards ?? []).length < 1)
			? {
					messageText: replacePlaceholders($i18n.ai_assistant.text.send_token_on_network_message, {
						$token: getTokenDisplaySymbol(mainCardToken),
						$network: (mainCardNetwork ?? mainCardToken.network).name
					})
				}
			: nonNullish(mainCardToken)
				? {
						messageText: replacePlaceholders($i18n.ai_assistant.text.send_token_message, {
							$token: getTokenDisplaySymbol(mainCardToken)
						})
					}
				: nonNullish(mainCardNetwork)
					? {
							messageText: replacePlaceholders($i18n.ai_assistant.text.send_on_network_message, {
								$network: mainCardNetwork.name
							})
						}
					: {
							messageText: $i18n.ai_assistant.text.action_button_send_tokens_prompt
						}
	);
</script>

<div class="flex w-full flex-col rounded-lg border-brand-subtle-20 bg-brand-subtle-10">
	<AiAssistantShowBalanceToolCard
		{...mainCard}
		{...nonNullish(secondaryCards) &&
			secondaryCards.length > 1 && { tokenCount: secondaryCards.length }}
		onClick={async () => !loading && (await onSendMessage(mainCardMessageParams))}
	>
		{#snippet cardDescription()}
			{#if isNullish(mainCardNetwork) && nonNullish(secondaryCards) && secondaryCards.length > 1}
				{#each [...new Set(secondaryCards.map(({ network: { name } }) => name))] as network, index (network)}
					{#if index !== 0}
						<Divider />
					{/if}{network}
				{/each}
			{:else if nonNullish(mainCardToken)}
				{mainCardToken.network.name}
			{/if}
		{/snippet}
	</AiAssistantShowBalanceToolCard>

	{#if nonNullish(secondaryCards)}
		{#each secondaryCards as secondaryCardToken, index (index)}
			<AiAssistantShowBalanceToolCard
				onClick={async () =>
					!loading &&
					(await onSendMessage({
						messageText: replacePlaceholders(
							$i18n.ai_assistant.text.send_token_on_network_message,
							{
								$token: getTokenDisplaySymbol(secondaryCardToken),
								$network: secondaryCardToken.network.name
							}
						)
					}))}
				styleClass="pl-6"
				token={secondaryCardToken}
				totalUsdBalance={secondaryCardToken.usdBalance ?? 0}
			>
				{#snippet cardDescription()}
					{secondaryCardToken.network.name}
				{/snippet}
			</AiAssistantShowBalanceToolCard>
		{/each}
	{/if}
</div>
