<script lang="ts">
	import type { IcToken } from '$icp/types/ic-token';
	import StakeForm from '$lib/components/stake/StakeForm.svelte';
	import TipExpiry from '$lib/components/tip/TipExpiry.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { TIP_MESSAGE_MAX_CHARS } from '$lib/constants/tip.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { isDesktop } from '$lib/utils/device.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { tipFees } from '$lib/utils/tip.utils';

	interface Props {
		token: IcToken;
		busy?: boolean;
		amount: OptionAmount;
		durationMs: number;
		message: string;
		onSelectToken: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		token,
		busy = false,
		amount = $bindable(),
		durationMs = $bindable(),
		message = $bindable(),
		onSelectToken,
		onClose,
		onNext
	}: Props = $props();

	let fees = $derived(tipFees(token.fee));

	// Counted in characters, matching the canister's own limit — a byte count
	// would reject a message the user sees as well within length.
	let messageTooLong = $derived([...message].length > TIP_MESSAGE_MAX_CHARS);

	const formatFee = (value: bigint) =>
		`${formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals })} ${token.symbol}`;
</script>

<StakeForm
	autofocus={isDesktop()}
	disabled={messageTooLong || busy}
	isSelectable
	nextLabel={$i18n.tip.text.generate}
	onClick={onSelectToken}
	{onClose}
	{onNext}
	bind:amount
	{...{ providerFee: fees.total }}
>
	{#snippet content()}
		<TipExpiry bind:durationMs />

		<div class="mb-4">
			<InputText
				name="tip-message"
				placeholder={$i18n.tip.text.message_placeholder}
				bind:value={message}
			/>

			{#if messageTooLong}
				<!-- The canister rejects anything longer, so the form blocks here rather
				     than letting Generate fail after an approve has already been paid for. -->
				<p class="mt-1 text-sm text-error-primary">
					{replacePlaceholders($i18n.tip.text.message_too_long, {
						$max: `${TIP_MESSAGE_MAX_CHARS}`
					})}
				</p>
			{/if}
		</div>

		<ModalExpandableValues>
			{#snippet listHeader()}
				<ModalValue>
					{#snippet label()}{$i18n.tip.text.total_estimated_fee}{/snippet}
					{#snippet mainValue()}{formatFee(fees.total)}{/snippet}
				</ModalValue>
			{/snippet}

			{#snippet listItems()}
				<!-- Two rows, not one, because they are charged at different moments and
				     the sender should see that the second one is still theirs to pay. -->
				<ModalValue>
					{#snippet label()}{$i18n.tip.text.reserve_fee}{/snippet}
					{#snippet mainValue()}{formatFee(fees.reserve)}{/snippet}
				</ModalValue>

				<ModalValue>
					{#snippet label()}{$i18n.tip.text.payout_fee}{/snippet}
					{#snippet mainValue()}{formatFee(fees.payout)}{/snippet}
				</ModalValue>

				<p class="text-sm text-tertiary">{$i18n.tip.text.fees_are_yours}</p>
			{/snippet}
		</ModalExpandableValues>

		<p class="mt-4 text-sm text-tertiary">{$i18n.tip.text.lapse_notice}</p>
	{/snippet}
</StakeForm>
