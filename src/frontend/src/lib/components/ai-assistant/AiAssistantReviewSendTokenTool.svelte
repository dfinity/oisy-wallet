<script lang="ts">
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReviewSendTokensToolResult } from '$lib/types/ai-assistant';

	interface Props extends ReviewSendTokensToolResult {}

	let { token, amount, contact, address, contactAddress }: Props = $props();

	let exchangeRate = $derived($exchanges?.[token.id]?.usd);
</script>

<SendTokenReview {exchangeRate} sendAmount={amount} {token}>
	{#snippet content()}
		<SendReviewDestination
			aiAssistantConsoleView={true}
			destination={contactAddress?.address ?? address ?? ''}
			selectedContact={contact}
		/>

		<div class="mb-2 mt-4">
			<ReviewNetwork sourceNetwork={token.network} />
		</div>

		<Hr />

		<div class="mb-4 mt-2">
			<FeeDisplay decimals={token.decimals} {exchangeRate} feeAmount={10n} symbol={token.symbol}>
				{#snippet label()}
					<span>{$i18n.fee.text.fee}</span>
				{/snippet}
			</FeeDisplay>
		</div>
	{/snippet}
</SendTokenReview>
