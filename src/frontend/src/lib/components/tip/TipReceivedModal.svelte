<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import TipClaimHero from '$lib/components/tip/TipClaimHero.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { TIP_RECEIVED_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { TipReceipt } from '$lib/types/tip';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		receipt: TipReceipt;
	}

	let { receipt }: Props = $props();

	const close = () => modalStore.close();

	// The amount is the whole point of the confirmation, so it leads the title —
	// but only when the ledger told us how to render it. Without that, the plain
	// title is the honest version; the alternative is quoting base units, which
	// would be a wrong number, not a vaguer one.
	let title = $derived(
		nonNullish(receipt.amountLabel) && notEmptyString(receipt.amountLabel)
			? replacePlaceholders($i18n.tip.text.received_title, { $amount: receipt.amountLabel })
			: $i18n.tip.text.claimed_title
	);
</script>

<!--
	No title snippet, so no header and no close cross: the way out of a
	confirmation is the button that acknowledges it. Escape and the backdrop still
	dismiss it, because nothing here is pending — the money has already landed.
-->
<Modal onClose={close}>
	<ContentWithToolbar>
		<TipClaimHero logo={receipt.logo} symbol={receipt.symbol} />

		<h3 class="mb-3 text-center">{title}</h3>

		<p class="mb-6 text-center text-tertiary">{$i18n.tip.text.received_description}</p>

		<!--
			The sender's message is revealed only to whoever claimed, and this is now
			the one place it is shown — the claim page hands off before it could.
		-->
		{#if nonNullish(receipt.message) && notEmptyString(receipt.message)}
			<p class="mb-6 text-center italic">“{receipt.message}”</p>
		{/if}

		<div class="mb-2">
			<ModalValue>
				{#snippet label()}{$i18n.tip.text.network}{/snippet}
				{#snippet mainValue()}{ICP_NETWORK.name}{/snippet}
			</ModalValue>

			{#if nonNullish(receipt.symbol) && notEmptyString(receipt.symbol)}
				<ModalValue>
					{#snippet label()}{$i18n.tip.text.claim_token}{/snippet}
					{#snippet mainValue()}{receipt.symbol}{/snippet}
				</ModalValue>
			{/if}

			<ModalValue>
				{#snippet label()}{$i18n.tip.text.claim_status}{/snippet}
				{#snippet mainValue()}<span class="text-success-primary"
						>{$i18n.tip.text.status_completed}</span
					>{/snippet}
			</ModalValue>
		</div>

		{#snippet toolbar()}
			<Button colorStyle="secondary-light" fullWidth onclick={close} testId={TIP_RECEIVED_BUTTON}>
				{$i18n.tip.text.take_me_to_wallet}
			</Button>
		{/snippet}
	</ContentWithToolbar>
</Modal>
