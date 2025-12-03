<script lang="ts">
	import { getContext } from 'svelte';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import List from '../common/List.svelte';
	import ListItem from '../common/ListItem.svelte';
	import LogoButton from '../ui/LogoButton.svelte';
	import TokenLogo from '../tokens/TokenLogo.svelte';
	import ExchangeTokenToPay from './ExchangeTokenToPay.svelte';
	import ExchangeTokenFee from './ExchangeTokenFee.svelte';
	import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
	import Divider from '../common/Divider.svelte';
	import SwapBestRateBadge from '../swap/SwapBestRateBadge.svelte';
	import { nonNullish } from '@dfinity/utils';
	import IconOisyMate from '../icons/IconOisyMate.svelte';
	import Button from '../ui/Button.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		onClose: void;
	}

	let { onClose } = $props();

	const { availableTokens, setSelectedToken } = getContext<PayContext>(PAY_CONTEXT_KEY);
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
							setSelectedToken(token);
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
							<ExchangeTokenToPay {token} />
						{/snippet}

						{#snippet descriptionEnd()}
							<div class="flex items-center justify-center gap-2">
								{#if token === $availableTokens[0]}
									<SwapBestRateBadge />
								{/if}

								<ExchangeTokenFee {token} />
							</div>
						{/snippet}
					</LogoButton>
				</ListItem>
			{/if}
		{/each}
	</List>
{:else}
	<div class="mb-12 flex flex-col items-center justify-center gap-4 text-center">
		<IconOisyMate />
		<h3>You have no supported tokens</h3>
		<p
			>OpenCrypto pay supports the following tokens: BTC, ETH, WBTC, XMR, dEURO, ZCHF, USDT, USDC,
			DAI, etc...
		</p>
		<Button colorStyle="secondary-light" onclick={() => goto('/')}>Go to Assets</Button>
	</div>
{/if}
