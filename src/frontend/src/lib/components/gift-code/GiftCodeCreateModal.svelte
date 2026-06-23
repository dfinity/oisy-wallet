<script lang="ts">
	import { Modal, QRCode } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		currentCurrencyDecimals,
		currentCurrencyExchangeRate,
		currentCurrencySymbol
	} from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { createGiftCode } from '$lib/services/gift-code.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { TokenUi } from '$lib/types/token-ui';
	import { formatToken } from '$lib/utils/format.utils';
	import { mapTokenUi } from '$lib/utils/token.utils';

	type Step = 'select-token' | 'select-expiry' | 'review' | 'creating' | 'success';

	let step: Step = $state('select-token');
	let selectedToken: IcToken | undefined = $state(undefined);
	let fiatAmount: number | undefined = $state(undefined);
	let expirySeconds: bigint = $state(86400n);
	let createdCode: string | undefined = $state(undefined);

	const expiryOptions: { label: string; value: bigint }[] = [
		{ label: $i18n.gift_code.create.text.expiry_1h, value: 3600n },
		{ label: $i18n.gift_code.create.text.expiry_24h, value: 86400n },
		{ label: $i18n.gift_code.create.text.expiry_7d, value: 604800n },
		{ label: $i18n.gift_code.create.text.expiry_30d, value: 2592000n }
	];

	const selectedExpiryLabel = $derived(
		expiryOptions.find((o) => o.value === expirySeconds)?.label ?? ''
	);

	const tokenUsdPrice = $derived.by(() => {
		if (isNullish(selectedToken)) {
			return undefined;
		}
		return $exchanges?.[selectedToken.id]?.usd;
	});

	const calculatedTokenAmount = $derived.by(() => {
		if (
			isNullish(fiatAmount) ||
			isNullish(tokenUsdPrice) ||
			tokenUsdPrice === 0 ||
			isNullish($currentCurrencyExchangeRate) ||
			$currentCurrencyExchangeRate === 0
		) {
			return undefined;
		}
		return (fiatAmount / tokenUsdPrice) * $currentCurrencyExchangeRate;
	});

	const amountBigInt = $derived.by(() => {
		if (isNullish(calculatedTokenAmount) || isNullish(selectedToken)) {
			return ZERO;
		}
		return BigInt(Math.floor(calculatedTokenAmount * 10 ** selectedToken.decimals));
	});

	const formattedTokenAmount = $derived.by(() => {
		if (isNullish(selectedToken) || amountBigInt === ZERO) {
			return undefined;
		}
		return formatToken({ value: amountBigInt, unitName: selectedToken.decimals });
	});

	const tokensWithBalance: TokenUi<IcToken>[] = $derived(
		$enabledIcTokens
			.map((token) =>
				mapTokenUi({
					token,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges
				})
			)
			.filter((token) => nonNullish(token.balance) && token.balance > ZERO)
			.sort((a, b) => (b.usdBalance ?? 0) - (a.usdBalance ?? 0))
	);

	const canProceedFromToken = $derived(
		nonNullish(selectedToken) &&
			nonNullish(fiatAmount) &&
			fiatAmount > 0 &&
			nonNullish(calculatedTokenAmount) &&
			calculatedTokenAmount > 0
	);

	const goToExpiry = () => {
		if (canProceedFromToken) {
			step = 'select-expiry';
		}
	};

	const goToReview = () => {
		step = 'review';
	};

	const goBack = () => {
		if (step === 'select-expiry') {
			step = 'select-token';
		} else if (step === 'review') {
			step = 'select-expiry';
		}
	};

	const handleCreate = async () => {
		if (isNullish($authIdentity) || isNullish(selectedToken) || isNullish(calculatedTokenAmount)) {
			return;
		}

		step = 'creating';

		const result = await createGiftCode({
			identity: $authIdentity,
			ledgerCanisterId: selectedToken.ledgerCanisterId,
			amount: amountBigInt,
			expirySeconds
		});

		if (result.success && nonNullish(result.code)) {
			createdCode = result.code;
			step = 'success';
		} else {
			step = 'review';
		}
	};

	const qrCodeUrl = $derived(
		nonNullish(createdCode) ? `${window.location.origin}/?gift=${createdCode}` : ''
	);
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}
		<span class="text-xl">{$i18n.gift_code.create.text.title}</span>
	{/snippet}

	<ContentWithToolbar>
		{#if step === 'select-token' && tokensWithBalance.length === 0}
			<p class="py-8 text-center text-secondary">{$i18n.gift_code.create.text.no_tokens}</p>
		{:else if step === 'select-token'}
			<div class="flex flex-col gap-4">
				<p class="text-secondary">{$i18n.gift_code.create.text.enter_amount}</p>

				<div class="flex items-center gap-2">
					<span class="text-lg font-bold text-tertiary">{$currentCurrencySymbol}</span>
					<InputCurrency
						name="gift-fiat-amount"
						decimals={$currentCurrencyDecimals}
						onBlur={() => {}}
						onFocus={() => {}}
						onInput={() => {}}
						placeholder="0"
						bind:value={fiatAmount}
					/>
				</div>

				{#if nonNullish(fiatAmount) && fiatAmount > 0}
					<p class="text-secondary">{$i18n.gift_code.create.text.select_token}</p>

					<div class="flex flex-col">
						{#each tokensWithBalance as token (token.ledgerCanisterId)}
							{@const usdPrice = $exchanges?.[token.id]?.usd}
							{@const tokenAmt =
								nonNullish(usdPrice) &&
								usdPrice > 0 &&
								nonNullish($currentCurrencyExchangeRate) &&
								$currentCurrencyExchangeRate > 0
									? (fiatAmount / usdPrice) * $currentCurrencyExchangeRate
									: undefined}
							{@const tokenAmtBigInt = nonNullish(tokenAmt)
								? BigInt(Math.floor(tokenAmt * 10 ** token.decimals))
								: ZERO}
							<button
								class="flex w-full items-center justify-between rounded-lg px-2 py-3 text-left transition-colors
									{selectedToken?.ledgerCanisterId === token.ledgerCanisterId
									? 'bg-brand-subtle-20'
									: 'hover:bg-brand-subtle-10'}"
								onclick={() => (selectedToken = token)}
							>
								<span class="flex min-w-0 items-center">
									<span class="mr-2 flex">
										<TokenLogo
											badge={{ type: 'network' }}
											color="white"
											data={token}
											logoSize="lg"
										/>
									</span>
									<span class="flex min-w-0 flex-col text-left">
										<span class="text-lg font-bold text-nowrap text-primary">
											{token.symbol}
										</span>
										{#if nonNullish(tokenAmt) && tokenAmtBigInt > ZERO}
											<span class="text-sm text-tertiary">
												≈ {formatToken({ value: tokenAmtBigInt, unitName: token.decimals })}
												{token.symbol}
											</span>
										{/if}
									</span>
								</span>
								<span class="flex flex-col text-right text-nowrap">
									<span class="text-lg font-bold">
										<TokenBalance data={token} />
									</span>
									<span class="text-sm text-tertiary">
										<ExchangeTokenValue data={token} />
									</span>
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{:else if step === 'select-expiry'}
			<div class="flex flex-col gap-4">
				<p class="text-secondary">{$i18n.gift_code.create.text.select_expiry}</p>

				<div class="flex flex-col gap-2">
					{#each expiryOptions as option (option.value)}
						<button
							class="rounded-lg border p-3 text-left transition-colors
								{expirySeconds === option.value
								? 'border-primary bg-brand-subtle-20'
								: 'hover:bg-dust border-transparent'}"
							onclick={() => (expirySeconds = option.value)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
		{:else if step === 'review'}
			<div class="flex flex-col gap-4">
				<h3 class="text-center">{$i18n.gift_code.create.text.review_title}</h3>

				<div class="bg-dust flex flex-col gap-2 rounded-lg p-4">
					<div class="flex justify-between">
						<span class="text-secondary">{$i18n.gift_code.create.text.review_token}</span>
						<span class="font-bold">{selectedToken?.symbol}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-secondary">{$i18n.gift_code.create.text.review_amount}</span>
						<span class="font-bold">
							{formattedTokenAmount}
							{selectedToken?.symbol}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-secondary">{$i18n.gift_code.create.text.review_amount}</span>
						<span class="text-secondary">
							{$currentCurrencySymbol}{fiatAmount}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-secondary">{$i18n.gift_code.create.text.review_expiry}</span>
						<span class="font-bold">{selectedExpiryLabel}</span>
					</div>
				</div>
			</div>
		{:else if step === 'creating'}
			<div class="flex flex-col items-center gap-4 py-8">
				<div class="animate-spin text-4xl">&#9696;</div>
				<p class="text-secondary">
					{$i18n.gift_code.create.text.creating}
				</p>
			</div>
		{:else if step === 'success'}
			<div class="flex flex-col items-center gap-4">
				<p class="text-center text-secondary">
					{$i18n.gift_code.create.text.success_description}
				</p>

				<div class="mx-auto aspect-square h-64 max-h-[40vh] max-w-full rounded-xl bg-white p-4">
					{#if nonNullish(createdCode)}
						<QRCode value={qrCodeUrl} />
					{/if}
				</div>

				<div
					class="flex w-full items-center justify-between gap-4 rounded-lg bg-brand-subtle-20 px-3 py-2"
				>
					<output class="text-sm break-all">{qrCodeUrl}</output>
					<ReceiveCopy
						address={qrCodeUrl}
						copyAriaLabel={$i18n.gift_code.create.text.link_copied}
					/>
				</div>
			</div>
		{/if}

		{#snippet toolbar()}
			{#if step === 'select-token' && tokensWithBalance.length === 0}
				<ButtonGroup>
					<ButtonCloseModal />
				</ButtonGroup>
			{:else if step === 'select-token'}
				<ButtonGroup>
					<ButtonCloseModal />
					<Button
						colorStyle="primary"
						disabled={!canProceedFromToken}
						fullWidth
						onclick={goToExpiry}
						paddingSmall
						type="button"
					>
						{$i18n.core.text.next}
					</Button>
				</ButtonGroup>
			{:else if step === 'select-expiry'}
				<ButtonGroup>
					<Button
						colorStyle="secondary-light"
						fullWidth
						onclick={goBack}
						paddingSmall
						type="button"
					>
						{$i18n.core.text.back}
					</Button>
					<Button colorStyle="primary" fullWidth onclick={goToReview} paddingSmall type="button">
						{$i18n.core.text.next}
					</Button>
				</ButtonGroup>
			{:else if step === 'review'}
				<ButtonGroup>
					<Button
						colorStyle="secondary-light"
						fullWidth
						onclick={goBack}
						paddingSmall
						type="button"
					>
						{$i18n.core.text.back}
					</Button>
					<Button colorStyle="primary" fullWidth onclick={handleCreate} paddingSmall type="button">
						{$i18n.gift_code.create.text.confirm}
					</Button>
				</ButtonGroup>
			{:else if step === 'success'}
				<ButtonGroup>
					<ButtonCloseModal />
				</ButtonGroup>
			{/if}
		{/snippet}
	</ContentWithToolbar>
</Modal>
