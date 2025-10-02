<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import type { IcTransactionType } from '$icp/types/ic-transaction';
	import Amount from '$lib/components/ui/Amount.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		label: string | undefined;
		fallback: IcTransactionType | undefined;
		token: OptionToken;
		approveAmount?: bigint;
	}

	const { label, fallback, token, approveAmount }: Props = $props();

	let fallbackLabel: string = $derived(
		nonNullish(fallback) ? $i18n.transaction.type[fallback] : ''
	);

	let twinToken: Token | undefined = $derived((token as OptionIcCkToken)?.twinToken);

	let labelText: string = $derived(
		nonNullish(label) ? resolveText({ i18n: $i18n, path: label }) : fallbackLabel
	);
</script>

{#if fallback === 'approve' && nonNullish(approveAmount) && nonNullish(token)}
	{labelText}
	<Amount
		amount={approveAmount * -1n}
		decimals={token.decimals}
		symbol={getTokenDisplaySymbol(token)}
	/>
{:else}
	{replacePlaceholders(labelText, {
		$twinToken: twinToken?.symbol ?? '',
		$twinNetwork: twinToken?.network.name ?? '',
		$ckToken: token?.symbol ?? ''
	})}
{/if}
