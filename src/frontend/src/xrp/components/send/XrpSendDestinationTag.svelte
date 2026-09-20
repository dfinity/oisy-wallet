<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import Input from '$lib/components/ui/Input.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	// XRPL destination tags are 32-bit unsigned integers.
	const MAX_DESTINATION_TAG = 4_294_967_295;

	interface Props {
		invalidDestinationTag?: boolean;
	}

	let { invalidDestinationTag = $bindable(false) }: Props = $props();

	const { sendXrpDestinationTag } = getContext<SendContext>(SEND_CONTEXT_KEY);

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

		const parsed = Number(trimmed);
		const valid =
			/^\d+$/.test(trimmed) && Number.isInteger(parsed) && parsed <= MAX_DESTINATION_TAG;

		invalidDestinationTag = !valid;

		sendXrpDestinationTag.set(valid ? parsed : undefined);
	};
</script>

<div class="mb-4">
	<Input
		name="xrp-destination-tag"
		inputType="text"
		{onInput}
		placeholder={$i18n.send.placeholder.xrp_destination_tag}
		required={false}
		testId="xrp-destination-tag-input"
		bind:value
	>
		{#snippet label()}
			<span>{$i18n.send.text.xrp_destination_tag}</span>
		{/snippet}

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
