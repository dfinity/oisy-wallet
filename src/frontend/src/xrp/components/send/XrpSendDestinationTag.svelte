<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import Input from '$lib/components/ui/Input.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	// The same parser `fetchNearIntentsXrpSwap` reads a 1Click deposit memo with, so the form and
	// the swap agree on what a tag is and on the `UInt32` bound `sendXrp` enforces before signing.
	import { parseXrpDestinationTag } from '$xrp/utils/xrp-send.utils';

	interface Props {
		invalidDestinationTag?: boolean;
	}

	let { invalidDestinationTag = $bindable(false) }: Props = $props();

	const { sendXrpDestinationTag } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const INPUT_NAME = 'xrp-destination-tag';
	const HINT_ID = 'xrp-destination-tag-hint';

	let value = $state<string>(nonNullish($sendXrpDestinationTag) ? `${$sendXrpDestinationTag}` : '');

	// An empty field means "no tag", which is valid. A non-empty one that does not parse must NOT
	// be silently dropped: the user entered a tag, and sending without it to an exchange deposit
	// address is not auto-creditable, so the form is blocked instead.
	const onInput = () => {
		const trimmed = `${value}`.trim();

		if (trimmed === '') {
			invalidDestinationTag = false;
			sendXrpDestinationTag.set(undefined);
			return;
		}

		const parsed = parseXrpDestinationTag(trimmed);

		invalidDestinationTag = isNullish(parsed);

		sendXrpDestinationTag.set(parsed);
	};
</script>

<div class="mb-4">
	<!-- Title and hint are rendered here rather than in `Input`'s label snippet so the hint sits
	between them without becoming part of the input's accessible name. -->
	<label class="font-bold" for={INPUT_NAME}>{$i18n.send.text.xrp_destination_tag}</label>

	<p
		id={HINT_ID}
		class="mt-1 mb-3 text-sm font-medium text-primary"
		data-tid="xrp-destination-tag-hint"
	>
		{$i18n.send.info.xrp_destination_tag_hint}
	</p>

	<Input
		name={INPUT_NAME}
		ariaDescribedBy={HINT_ID}
		inputType="text"
		{onInput}
		placeholder={$i18n.send.placeholder.xrp_destination_tag}
		required={false}
		showInfo={false}
		testId="xrp-destination-tag-input"
		bind:value
	>
		{#snippet bottom()}
			{#if invalidDestinationTag}
				<!-- `role="alert"` because this appears on input and blocks the form: without a live
				region a screen-reader user gets a form that refuses to advance and no reason why. -->
				<p
					class="mt-4 mb-0 text-error-primary"
					data-tid="xrp-destination-tag-error"
					role="alert"
					transition:slide={SLIDE_DURATION}
				>
					{$i18n.send.assertion.xrp_destination_tag_invalid}
				</p>
			{/if}
		{/snippet}
	</Input>
</div>
