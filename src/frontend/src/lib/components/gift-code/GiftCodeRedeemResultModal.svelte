<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { GiftCodeRedeemStateData } from '$lib/types/gift-code';

	interface Props {
		data: GiftCodeRedeemStateData;
	}

	let { data }: Props = $props();

	const errorMessage = $derived(
		nonNullish(data.error) ? data.error : $i18n.gift_code.error.redeeming
	);
</script>

{#if data.success}
	<Sprinkles />
{/if}

<Modal onClose={modalStore.close}>
	{#snippet title()}
		<span class="text-xl">
			{data.success
				? $i18n.gift_code.redeem.text.success_title
				: $i18n.gift_code.redeem.text.failed_title}
		</span>
	{/snippet}

	<ContentWithToolbar>
		<div class="flex flex-col items-center gap-4 py-8">
			<span class="text-5xl">{data.success ? '🎁' : '😔'}</span>

			<p class="text-center">
				{data.success ? $i18n.gift_code.redeem.text.success_description : errorMessage}
			</p>
		</div>

		{#snippet toolbar()}
			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={modalStore.close}
				paddingSmall
				type="button"
			>
				{$i18n.core.text.close}
			</Button>
		{/snippet}
	</ContentWithToolbar>
</Modal>
