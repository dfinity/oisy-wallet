<script lang="ts">
	import { getContext } from 'svelte';
	import Button from '../ui/Button.svelte';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import LogoButton from '../ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import TokenLogo from '../tokens/TokenLogo.svelte';
	import ExchangeTokenToPay from './ExchangeTokenToPay.svelte';
	import ExchangeTokenFee from './ExchangeTokenFee.svelte';
	import Divider from '../common/Divider.svelte';
	import Badge from '../ui/Badge.svelte';
	import IconStar from '../icons/IconStar.svelte';
	import Responsive from '../ui/Responsive.svelte';
	import { nonNullish } from '@dfinity/utils';
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

<div class="mt-8 mb-2 flex w-full items-end justify-between px-3">
	<h3>Pay with</h3>
	{#if nonNullish($availableTokens) && $availableTokens.length > 1}
		<p class="m-0">{$availableTokens.length} tokens available</p>
	{/if}
</div>

<div class="mb-4 rounded-[28px] border border-disabled bg-secondary p-3 text-center">
	{#if nonNullish($selectedToken)}
		<LogoButton hover={false} fullWidth styleClass="mb-2">
			{#snippet title()}
				{$selectedToken.amount} {$selectedToken.symbol}
			{/snippet}

			{#snippet description()}
				{$selectedToken.name}

				<span class="text-tertiary"><Divider /></span>

				{$selectedToken.network.name}
			{/snippet}

			{#snippet logo()}
				<div class="mr-2">
					<TokenLogo
						badge={{ type: 'network' }}
						color="white"
						data={$selectedToken}
						logoSize="lg"
					/>
				</div>
			{/snippet}

			{#snippet titleEnd()}
				<ExchangeTokenToPay token={$selectedToken} />
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
