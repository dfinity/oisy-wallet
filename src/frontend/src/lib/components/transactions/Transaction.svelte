<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component } from 'svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionStatusComponent from '$lib/components/transactions/TransactionStatus.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus, TransactionType } from '$lib/types/transaction';
	import { formatSecondsToDate } from '$lib/utils/format.utils';
	import { mapTransactionIcon } from '$lib/utils/transaction.utils';

	export let amount: bigint | undefined;
	export let type: TransactionType;
	export let status: TransactionStatus;
	export let timestamp: number | undefined;
	export let styleClass: string | undefined = undefined;
	export let token: Token;
	export let iconType: 'token' | 'transaction' = 'transaction';

	let icon: Component;
	$: icon = mapTransactionIcon({ type, status });

	let iconWithOpacity: boolean;
	$: iconWithOpacity = status === 'pending' || status === 'unconfirmed';
</script>

<button class={`contents ${styleClass ?? ''}`} on:click>
	<div class="rounded-xl px-3 py-2 hover:bg-brand-subtle-10">
		<Card noMargin>
			<span class="inline-block"><slot /></span>

			<div slot="icon">
				{#if iconType === 'token'}
					<TokenLogo data={token} badge={{ type: 'icon', icon, ariaLabel: type }} />
				{:else}
					<RoundedIcon {icon} opacity={iconWithOpacity} />
				{/if}
			</div>

			<svelte:fragment slot="amount">
				{#if nonNullish(amount)}
					{#if $isPrivacyMode}
						<IconDots />
					{:else}
						<Amount {amount} decimals={token.decimals} symbol={token.symbol} formatPositiveAmount />
					{/if}
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="description">
				<span data-tid="receive-tokens-modal-transaction-timestamp">
					{#if nonNullish(timestamp)}
						{formatSecondsToDate(timestamp)}
					{/if}
				</span>
				<TransactionStatusComponent {status} />
			</svelte:fragment>
		</Card>
	</div>
</button>
