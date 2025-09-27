<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (info-message to info_message) making the component unusable -->
<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (info-message to info_message) making the component unusable -->
<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (info-message to info_message) making the component unusable -->
<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import ConvertReviewNetworks from '$lib/components/convert/ConvertReviewNetworks.svelte';
	import TokensReview from '$lib/components/tokens/TokensReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount = undefined;
	export let receiveAmount: number | undefined = undefined;

	const dispatch = createEventDispatcher();

	const { sourceToken, destinationToken, sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<TokensReview
		destinationToken={$destinationToken}
		destinationTokenExchangeRate={$destinationTokenExchangeRate}
		{receiveAmount}
		{sendAmount}
		sourceToken={$sourceToken}
		sourceTokenExchangeRate={$sourceTokenExchangeRate}
	/>

	<ConvertReviewNetworks />

	<slot name="destination" />

	<slot name="fee" />

	<slot name="info-message" />

	{#snippet toolbar()}
		<ButtonGroup>
			<slot name="cancel" />

			<Button onclick={() => dispatch('icConvert')} testId="convert-review-button-next">
				{$i18n.convert.text.convert_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
