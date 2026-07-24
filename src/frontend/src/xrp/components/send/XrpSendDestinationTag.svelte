<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	// XRPL destination tags are 32-bit unsigned integers.
	const MAX_DESTINATION_TAG = 4_294_967_295;

	const { sendXrpDestinationTag } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let value = $state<string>(nonNullish($sendXrpDestinationTag) ? `${$sendXrpDestinationTag}` : '');

	const onInput = () => {
		const trimmed = `${value}`.trim();
		const parsed = Number(trimmed);
		const valid =
			trimmed !== '' && Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_DESTINATION_TAG;

		sendXrpDestinationTag.set(valid ? parsed : undefined);
	};
</script>

<div class="mb-4">
	<Input
		name="xrp-destination-tag"
		inputType="text"
		{onInput}
		placeholder={$i18n.send.placeholder.xrp_destination_tag}
		testId="xrp-destination-tag-input"
		bind:value
	>
		{#snippet label()}
			<span>{$i18n.send.text.xrp_destination_tag}</span>
		{/snippet}
	</Input>
</div>
