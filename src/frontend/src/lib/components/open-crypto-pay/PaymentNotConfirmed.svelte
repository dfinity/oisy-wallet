<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import PaymentStatusHero from '$lib/components/open-crypto-pay/PaymentStatusHero.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	const { data } = getContext<PayContext>(PAY_CONTEXT_KEY);
</script>

<ContentWithToolbar styleClass="flex flex-col w-full">
	<PaymentStatusHero status="not_confirmed" />

	{#if nonNullish($data?.displayName)}
		<div class="mt-4">
			<MessageBox level="warning">
				{replacePlaceholders($i18n.scanner.text.payment_not_confirmed_description, {
					$receipt: $data.displayName
				})}
			</MessageBox>
		</div>
	{/if}

	{#snippet toolbar()}
		<Button fullWidth onclick={onClose}>{$i18n.core.text.close}</Button>
	{/snippet}
</ContentWithToolbar>
