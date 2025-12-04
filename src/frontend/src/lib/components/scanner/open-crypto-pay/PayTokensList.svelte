<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
	import OpenCryptoPayTokenAmount from '$lib/components/scanner/OpenCryptoPayTokenAmount.svelte';
	import EmptyTokenList from '$lib/components/tokens/EmptyTokenList.svelte';
	import TokenFeeValue from '$lib/components/tokens/TokenFeeValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	const { availableTokens, selectToken } = getContext<PayContext>(PAY_CONTEXT_KEY);
</script>

{#if nonNullish($availableTokens) && $availableTokens.length > 0}
	<List noPadding>
		{#each $availableTokens as token (token.id)}
			{#if isNetworkIdEthereum(token.network.id) || isNetworkIdEvm(token.network.id)}
				<ListItem styleClass="first-of-type:border-t-1">
					<LogoButton
						dividers={false}
						fullWidth
						onClick={() => {
							selectToken(token);
							onClose();
						}}
					>
						{#snippet title()}
							{token.amount} {token.symbol}
						{/snippet}

						{#snippet description()}
							{token.name}

							<span class="text-tertiary"><Divider /></span>

							{token.network.name}
						{/snippet}

						{#snippet logo()}
							<div class="mr-2">
								<TokenLogo badge={{ type: 'network' }} color="white" data={token} logoSize="lg" />
							</div>
						{/snippet}

						{#snippet titleEnd()}
							<OpenCryptoPayTokenAmount
								amountInUSD={token.sumInUSD}
								isBestRate={token.id === $availableTokens[0].id}
							/>
						{/snippet}

						{#snippet descriptionEnd()}
							<div class="flex justify-end">
								<TokenFeeValue feeInUSD={token.feeInUSD} />
							</div>
						{/snippet}
					</LogoButton>
				</ListItem>
			{/if}
		{/each}
	</List>
{:else}
	<EmptyTokenList text={$i18n.scanner.text.supported_tokens} />
{/if}
