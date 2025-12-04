<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import OpenCryptoPayTokenAmount from '$lib/components/scanner/OpenCryptoPayTokenAmount.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import BestRateBadge from '$lib/components/ui/BestRateBadge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onSelectToken: () => void;
		isTokenSelecting: boolean;
	}

	let { onSelectToken, isTokenSelecting = $bindable() }: Props = $props();
	const { selectedToken, availableTokens } = getContext<PayContext>(PAY_CONTEXT_KEY);

	let selectButtonText = $derived(
		nonNullish($selectedToken)
			? $i18n.scanner.text.select_different_token
			: $i18n.scanner.text.select_token
	);
</script>

<div class="mt-8 mb-2 flex w-full items-end justify-between px-3">
	<h3>{$i18n.scanner.text.pay_with}</h3>

	<p class="m-0">
		{replacePlaceholders($i18n.scanner.text.tokens_available, {
			$amount: `${$availableTokens.length}`
		})}
	</p>
</div>

<div class="mb-4 rounded-3xl border border-disabled bg-secondary p-3 text-center">
	{#if nonNullish($selectedToken)}
		<LogoButton fullWidth hover={false} styleClass="mb-2">
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
				<OpenCryptoPayTokenAmount amountInUSD={$selectedToken.amountInUSD} />
			{/snippet}

			{#snippet descriptionEnd()}
				<div class="flex items-center justify-center gap-2">
					{#if $selectedToken.id === $availableTokens[0].id}
						<BestRateBadge />
					{/if}
				</div>
			{/snippet}
		</LogoButton>
	{/if}

	<Responsive down="sm">
		<Button
			colorStyle="secondary-light"
			fullWidth
			onclick={() => {
				onSelectToken();
				isTokenSelecting = true;
			}}>{selectButtonText}</Button
		>
	</Responsive>

	<Responsive up="md">
		<Button colorStyle="secondary-light" fullWidth onclick={onSelectToken}
			>{selectButtonText}</Button
		>
	</Responsive>
</div>
