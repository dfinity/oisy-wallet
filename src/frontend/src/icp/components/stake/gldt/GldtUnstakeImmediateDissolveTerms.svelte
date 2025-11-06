<script lang="ts">
	import { getContext } from 'svelte';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		isReview?: boolean;
	}

	let { isReview = false }: Props = $props();

	const { sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<span class="flex w-full text-xs">
	<IconClock />

	<span class="ml-2 flex w-full flex-col" class:text-xs={!isReview}>
		{#if isReview}
			<span class="mb-1 font-bold">
				{$i18n.stake.text.immediate_dissolve}
			</span>
		{/if}

		<span class="text-tertiary">
			{replacePlaceholders($i18n.stake.text.immediate_dissolve_terms, {
				$token: $sendTokenSymbol
			})}
		</span>
	</span>
</span>
