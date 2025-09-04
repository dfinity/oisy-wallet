<script lang="ts">
	import { debounce, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import QrButton from '$lib/components/common/QrButton.svelte';
	import ButtonReset from '$lib/components/ui/ButtonReset.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { MIN_DESTINATION_LENGTH_FOR_ERROR_STATE } from '$lib/constants/app.constants';
	import { DESTINATION_INPUT } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { NetworkId } from '$lib/types/network';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { getNetworkContact } from '$lib/utils/contacts.utils';
	import { isDesktop } from '$lib/utils/device.utils';
	import { getKnownDestination } from '$lib/utils/known-destinations.utils';

	interface Props {
		destination: string;
		networkId?: NetworkId;
		invalidDestination: boolean;
		inputPlaceholder: string;
		onInvalidDestination?: () => boolean;
		onQRButtonClick?: () => void;
		knownDestinations?: KnownDestinations;
		networkContacts?: NetworkContacts;
	}

	let {
		destination = $bindable(''),
		networkId,
		invalidDestination = $bindable(false),
		inputPlaceholder,
		onInvalidDestination,
		onQRButtonClick,
		knownDestinations,
		networkContacts
	}: Props = $props();

	const validate = () => (invalidDestination = onInvalidDestination?.() ?? false);

	const debounceValidate = debounce(validate);

	const sendContext = getContext<SendContext>(SEND_CONTEXT_KEY);

	const convertContext = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const sendTokenNetworkId = nonNullish(sendContext) ? sendContext.sendTokenNetworkId : undefined;

	const destinationToken = nonNullish(convertContext) ? convertContext.destinationToken : undefined;

	let destinationNetworkId: NetworkId | undefined = $derived(
		nonNullish(sendTokenNetworkId)
			? $sendTokenNetworkId
			: nonNullish(destinationToken)
				? $destinationToken?.network.id
				: undefined
	);

	let inputElement: HTMLInputElement | undefined = $state();

	let focused: boolean = $state(false);
	const onFocus = () => (focused = true);
	const onBlur = () => (focused = false);

	$effect(() => {
		destination;
		networkId;
		onInvalidDestination;
		debounceValidate();
	});

	let isErrorState = $derived(
		invalidDestination && destination.length > MIN_DESTINATION_LENGTH_FOR_ERROR_STATE
	);

	let isNotKnownDestination = $derived(
		nonNullish(knownDestinations) &&
			nonNullish(destinationNetworkId) &&
			isNullish(
				getKnownDestination({
					knownDestinations,
					address: destination,
					networkId: destinationNetworkId
				})
			)
	);

	let isNotNetworkContact = $derived(
		nonNullish(networkContacts) &&
			nonNullish(destinationNetworkId) &&
			isNullish(
				getNetworkContact({
					networkContacts,
					address: destination,
					networkId: destinationNetworkId
				})
			)
	);
</script>

<div
	class="rounded-lg border border-solid p-5 text-left duration-300"
	class:bg-brand-subtle-10={focused}
	class:bg-secondary={!focused}
	class:border-brand-subtle-20={focused}
	class:border-secondary={!focused}
>
	<label class="font-bold" for="destination">
		{$i18n.core.text.to}
	</label>

	<div class="send-input-destination" class:error={isErrorState}>
		<InputTextWithAction
			name="destination"
			autofocus={isDesktop()}
			placeholder={inputPlaceholder}
			testId={DESTINATION_INPUT}
			bind:value={destination}
			on:focus={onFocus}
			on:blur={onBlur}
			on:nnsInput
			bind:inputElement
		>
			{#snippet innerEnd()}
				<span class="flex gap-1 bg-primary">
					{#if notEmptyString(destination)}
						<ButtonReset
							onclick={() => {
								destination = '';
								if (nonNullish(inputElement)) {
									inputElement.focus();
								}
							}}
						/>
					{/if}
					{#if nonNullish(onQRButtonClick)}
						<QrButton on:click={onQRButtonClick} />
					{/if}
				</span>
			{/snippet}
		</InputTextWithAction>

		{#if isErrorState}
			<p class="mb-0 mt-4 text-error-primary" transition:slide={SLIDE_DURATION}>
				{$i18n.send.assertion.invalid_destination_address}
			</p>
		{/if}
	</div>
</div>

{#if !invalidDestination && destination.length > MIN_DESTINATION_LENGTH_FOR_ERROR_STATE && isNotKnownDestination && isNotNetworkContact}
	<div transition:slide={SLIDE_DURATION}>
		<MessageBox level="warning" styleClass="mt-4">
			{$i18n.send.info.unknown_destination}
		</MessageBox>
	</div>
{/if}

<style lang="scss">
	:global(.error.send-input-destination div.input-field input) {
		--input-error-color: var(--color-border-error-solid);
		--secondary: var(--color-border-error-solid);
		--focus-background-contrast: var(--color-border-error-solid);
		--input-background-contrast: var(--color-border-error-solid);
	}
</style>
