<script lang="ts">
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import bitcoin from '$btc/assets/bitcoin.svg?inline';
	import { earningProviderConfigs } from '$env/earning-providers.env';
	import usdCoin from '$eth/assets/usdc.svg?inline';
	import LandingPreviewFrame from '$lib/components/auth/LandingPreviewFrame.svelte';
	import IconPlant from '$lib/components/icons/IconPlant.svelte';
	import IconCircleCheck from '$lib/components/icons/lucide/IconCircleCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { Currency } from '$lib/enums/currency';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const ROTATION_INTERVAL_MS = 5_000;
	const VISIBLE_FRACTION = 0.5;
	const liquidium = earningProviderConfigs.find(({ id }) => id === 'liquidium');
	const harvestAutopilot = earningProviderConfigs.find(({ id }) => id === 'harvest-autopilot');

	// The sample loan and annual earnings are illustrative.
	const health = 72;
	const annualEarningsUsd = 48;
	const annualEarnings = $derived(
		replacePlaceholders($i18n.stake.text.active_earning_per_year_short, {
			$amount: new Intl.NumberFormat($i18n.lang, {
				style: 'currency',
				currency: Currency.USD,
				signDisplay: 'always'
			}).format(annualEarningsUsd)
		})
	);

	const rows = $derived([
		{
			label: $i18n.liquidium.text.collateral,
			icon: bitcoin,
			amount: '0.25 BTC',
			value: '$16,020.00'
		},
		{
			label: $i18n.auth.landing.borrow_loan,
			icon: usdCoin,
			amount: '4,000 USDC',
			value: '$4,000.00'
		}
	]);
	const previews = $derived([$i18n.liquidium.text.action_borrow, $i18n.earning.text.title]);
	const suppliedAmount = $derived(new Intl.NumberFormat($i18n.lang).format(1_000));

	let active = $state(0);
	let stack = $state<HTMLDivElement>();
	let inView = $state(false);
	let tabVisible = $state(false);
	let hovered = $state(false);
	let playing = $state(true);
	const canRotate = $derived(!prefersReducedMotion.current);
	const rotating = $derived(canRotate && playing && inView && tabVisible && !hovered);

	onMount(() => {
		if (!stack || typeof IntersectionObserver === 'undefined') {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				inView = entry.intersectionRatio >= VISIBLE_FRACTION;
			},
			{ threshold: VISIBLE_FRACTION }
		);
		observer.observe(stack);

		const syncTabVisibility = () => (tabVisible = !document.hidden);
		syncTabVisibility();
		document.addEventListener('visibilitychange', syncTabVisibility);

		return () => {
			observer.disconnect();
			document.removeEventListener('visibilitychange', syncTabVisibility);
		};
	});

	$effect(() => {
		if (!rotating) {
			return;
		}

		const interval = window.setInterval(() => {
			active = (active + 1) % previews.length;
		}, ROTATION_INTERVAL_MS);

		return () => window.clearInterval(interval);
	});

	const selectPreview = (index: number) => {
		playing = false;
		active = index;
	};

	const stopOnKeyboardFocus = ({ target }: FocusEvent) => {
		// Pointer focus must not change the action on the Pause button before its click.
		if (target instanceof HTMLElement && target.matches(':focus-visible')) {
			playing = false;
		}
	};
</script>

<div
	class="flex min-w-0 flex-col gap-3"
	aria-label={$i18n.auth.landing.borrow_eyebrow}
	onfocusin={stopOnKeyboardFocus}
	onpointerenter={({ pointerType }) => (hovered = pointerType === 'mouse')}
	onpointerleave={() => (hovered = false)}
	role="group"
>
	<div bind:this={stack} class="isolate grid min-w-0 pe-4 pb-4 sm:pe-6 sm:pb-6">
		{#each [borrowCard, earnCard] as card, index (index)}
			<div
				class={[
					'col-start-1 row-start-1 grid min-w-0 transition-[translate,scale,opacity] duration-300 ease-out motion-reduce:transition-none',
					active === index
						? 'z-1'
						: 'translate-y-3 scale-[0.98] opacity-75 sm:translate-y-5 ltr:translate-x-3 sm:ltr:translate-x-5 rtl:-translate-x-3 sm:rtl:-translate-x-5'
				]}
				aria-hidden={active !== index || undefined}
				inert={active !== index}
			>
				{@render card()}
			</div>
		{/each}
	</div>
	<div
		class="grid grid-cols-[minmax(2.5rem,1fr)_minmax(0,max-content)_minmax(2.5rem,1fr)] items-center gap-x-2"
	>
		{#if canRotate}
			<ButtonIcon
				ariaLabel={playing
					? $i18n.auth.landing.borrow_preview_pause
					: $i18n.auth.landing.borrow_preview_play}
				onclick={() => (playing = !playing)}
				styleClass="group col-start-1 row-start-1 justify-self-end rounded-full"
			>
				{#snippet icon()}
					{#if playing}
						<span
							class="flex h-4 items-center gap-1 text-secondary group-hover:text-primary"
							aria-hidden="true"
						>
							<span class="h-3.5 w-0.5 rounded-full bg-current"></span>
							<span class="h-3.5 w-0.5 rounded-full bg-current"></span>
						</span>
					{:else}
						<span
							class="size-3.5 bg-current text-secondary [clip-path:polygon(17%_0,100%_50%,17%_100%)] group-hover:text-primary"
							aria-hidden="true"
						></span>
					{/if}
				{/snippet}
			</ButtonIcon>
		{/if}
		<div class="col-start-2 row-start-1 flex flex-wrap justify-center gap-x-1">
			{#each previews as label, index (index)}
				<button
					class={[
						'focus-visible:outline-brand-primary min-h-10 justify-center rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2',
						active === index
							? 'text-primary underline decoration-2 underline-offset-6'
							: 'text-secondary hover:text-primary'
					]}
					aria-pressed={active === index}
					onclick={() => selectPreview(index)}
					type="button"
				>
					{label}
				</button>
			{/each}
		</div>
	</div>
</div>

{#snippet borrowCard()}
	<LandingPreviewFrame label={$i18n.auth.landing.borrow_preview} stretch>
		<div class="@container flex flex-col justify-between gap-4 p-3 sm:p-7">
			<div class="grid gap-2 @min-[22rem]:grid-cols-2">
				{#each rows as { label, icon, amount, value } (label)}
					<div class="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
						<span class="text-sm text-tertiary">{label}</span>
						<span class="flex items-center gap-3">
							<img class="size-9 rounded-full" alt="" src={icon} />
							<span class="flex flex-col">
								<span class="text-xl font-bold tracking-tight text-primary">{amount}</span>
								<span class="text-sm text-tertiary">{value}</span>
							</span>
						</span>
					</div>
				{/each}
			</div>

			<div class="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
				<div class="flex items-center justify-between gap-3">
					<span class="text-sm text-tertiary">{$i18n.auth.landing.borrow_health}</span>
					<span class="flex items-center gap-1.5 text-sm font-semibold text-success-primary">
						<IconCircleCheck size="16" />
						{$i18n.auth.landing.borrow_healthy}
						<span>{health}%</span>
					</span>
				</div>
				<span class="h-2 overflow-hidden rounded-full bg-tertiary">
					<span style:width={`${health}%`} class="block h-full rounded-full bg-success-primary"
					></span>
				</span>
			</div>

			<span
				class="flex h-12 items-center justify-center rounded-2xl bg-brand-primary font-bold text-primary-inverted"
			>
				{$i18n.liquidium.text.action_borrow}
			</span>
		</div>
	</LandingPreviewFrame>
{/snippet}

{#snippet earnCard()}
	<LandingPreviewFrame
		label={harvestAutopilot
			? $i18n.auth.landing.earn_preview_with_harvest
			: $i18n.auth.landing.earn_preview}
		stretch
	>
		<div class="flex flex-col justify-between gap-4 p-3 sm:p-7">
			<div class="flex flex-wrap items-center gap-2">
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle-10 text-brand-primary-alt"
				>
					<IconPlant size="18" />
				</span>
				<span class="font-bold text-primary">{$i18n.earning.text.title}</span>
				<span class="ms-auto text-sm text-tertiary">{$i18n.auth.landing.earn_preview_example}</span>
			</div>

			<div class="flex flex-col gap-4 rounded-2xl bg-secondary p-4">
				<span class="flex items-center gap-3">
					<img class="size-9 shrink-0 rounded-full" alt="" src={usdCoin} />
					<span class="flex min-w-0 flex-col gap-1">
						<span class="font-bold text-primary">USDC</span>
						<span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tertiary">
							<span class="inline-flex items-center gap-1.5">
								{#if liquidium}
									<img class="size-4 shrink-0 rounded-full" alt="" src={liquidium.logo} />
								{/if}
								{$i18n.earning.cards.liquidium.title}
							</span>
							{#if harvestAutopilot}
								<span class="inline-flex items-center gap-1.5">
									<img class="size-4 shrink-0 rounded-full" alt="" src={harvestAutopilot.logo} />
									{$i18n.earning.cards.harvest_autopilot.title}
								</span>
							{/if}
						</span>
					</span>
				</span>
				<span
					class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-t border-tertiary pt-3"
				>
					<span class="text-sm text-tertiary">
						{replacePlaceholders($i18n.auth.landing.earn_preview_supplied, {
							$provider: $i18n.earning.cards.liquidium.title
						})}
					</span>
					<span class="font-semibold text-primary tabular-nums">{suppliedAmount} USDC</span>
				</span>
				<span class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
					<span class="text-sm text-secondary">{$i18n.stake.text.earning_potential}</span>
					<span class="font-bold text-brand-primary-alt tabular-nums">{annualEarnings}</span>
				</span>
			</div>

			<Button colorStyle="secondary-light" fullWidth type="button">
				{$i18n.auth.landing.earn_preview_start}
			</Button>
		</div>
	</LandingPreviewFrame>
{/snippet}
