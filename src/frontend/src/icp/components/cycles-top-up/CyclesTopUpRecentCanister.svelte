<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import SendContactName from '$lib/components/send/SendContactName.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import type { ContactUi } from '$lib/types/contact';
	import {
		formatSecondsToNormalizedDate,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';

	interface Props {
		canisterId: string;
		// The newest top-up's amount, in cycles.
		value?: bigint;
		timestamp?: bigint;
		// The TCYCLES token whose history lists the top-up.
		token: IcToken;
		// The saved contact the canister ID is an address of, if any.
		contact?: ContactUi;
		onSelect: (canisterId: string) => void;
	}

	let { canisterId, value, timestamp, token, contact, onSelect }: Props = $props();

	let currentDate = $state(new Date());
</script>

<LogoButton onClick={() => onSelect(canisterId)}>
	{#snippet logo()}
		<div class="mr-2">
			<AvatarWithBadge
				address={canisterId}
				badge={{ type: 'addressType', address: canisterId }}
				{contact}
				variant="sm"
			/>
		</div>
	{/snippet}

	{#snippet title()}
		<span class="text-base">
			{#if isNullish(contact)}
				{shortenWithMiddleEllipsis({ text: canisterId })}
			{:else}
				<SendContactName address={canisterId} {contact} />
			{/if}
		</span>
	{/snippet}

	{#snippet description()}
		{#if nonNullish(value)}
			<Amount amount={value} decimals={token.decimals} symbol={token.symbol} />
		{/if}
	{/snippet}

	{#snippet descriptionEnd()}
		{#if nonNullish(timestamp)}
			{formatSecondsToNormalizedDate({
				seconds: normalizeTimestampToSeconds(timestamp),
				currentDate,
				language: $currentLanguage
			})}
		{/if}
	{/snippet}
</LogoButton>
