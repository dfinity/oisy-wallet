<script lang="ts">
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import { fade, slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Balance from '$lib/components/hero/Balance.svelte';
	import Erc20Icp from '$lib/components/core/Erc20Icp.svelte';
	import ExchangeBalance from '$lib/components/exchange/ExchangeBalance.svelte';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import Actions from '$lib/components/hero/Actions.svelte';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let more = false;

	let displayTokenSymbol = false;
	$: displayTokenSymbol = summary && $erc20UserTokensInitialized;
</script>

{#if summary}
	<div transition:slide={{ delay: 0, duration: 250, easing: quintOut, axis: 'y' }}>
		<div class="icon flex justify-center items-center mt-6 md:mt-12 mb-0.5 pt-2">
			{#if displayTokenSymbol}
				<div in:fade>
					<Logo
						src={$token?.icon}
						size="big"
						alt={replacePlaceholders($i18n.core.alt.logo, { $name: $token?.name ?? '' })}
						color="off-white"
					/>
				</div>
			{:else}
				<SkeletonLogo size="big" />
			{/if}
		</div>

		<Balance />
	</div>
{/if}

{#if usdTotal}
	<div transition:slide={{ delay: 0, duration: 250, easing: quintOut, axis: 'y' }}>
		<ExchangeBalance />
	</div>
{/if}

{#if actions}
	<div
		transition:slide={{ delay: 0, duration: 250, easing: quintOut, axis: 'y' }}
		class="flex w-full justify-center"
	>
		<Actions {more} />
	</div>
{/if}

{#if isErc20Icp($token)}
	<Erc20Icp />
{/if}

<style lang="scss">
	.icon {
		min-height: calc(64px + var(--padding-4x));
	}
</style>
