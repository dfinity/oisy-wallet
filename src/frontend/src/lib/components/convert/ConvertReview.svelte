<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ConvertReviewAmount from '$lib/components/convert/ConvertReviewAmount.svelte';
	import ConvertReviewNetworks from '$lib/components/convert/ConvertReviewNetworks.svelte';
	import ConvertReviewTokens from '$lib/components/convert/ConvertReviewTokens.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount = undefined;
	export let receiveAmount: number | undefined = undefined;

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	<ConvertReviewTokens />

	<div slot="outer-content" class="my-4">
		<ConvertReviewNetworks />

		<ConvertReviewAmount {sendAmount} {receiveAmount} />

		<slot name="fee" />

		<slot name="info-message" />
	</div>

	<ButtonGroup slot="toolbar">
		<slot name="cancel" />

		<Button on:click={() => dispatch('icConvert')}>
			{$i18n.convert.text.convert_button}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
