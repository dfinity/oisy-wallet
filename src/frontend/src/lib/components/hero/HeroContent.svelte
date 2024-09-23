<script lang="ts">
	import { quintOut } from 'svelte/easing';
	import { fade, slide } from 'svelte/transition';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import Back from '$lib/components/core/Back.svelte';
	import Erc20Icp from '$lib/components/core/Erc20Icp.svelte';
	import ExchangeBalance from '$lib/components/exchange/ExchangeBalance.svelte';
	import Actions from '$lib/components/hero/Actions.svelte';
	import Balance from '$lib/components/hero/Balance.svelte';
	import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let back = false;

	let displayTokenSymbol = false;
	$: displayTokenSymbol = summary && $erc20UserTokensInitialized;
</script>

{#if summary}
	<div
		transition:slide={{ delay: 0, duration: 250, easing: quintOut, axis: 'y' }}
		class="grid grid-cols-[1fr_auto_1fr] flex-row items-start justify-between w-full"
	>
		{#if back}
			<Back />
		{/if}

		<div>
			<div class="icon flex justify-center items-center mb-0.5 pt-2">
				{#if displayTokenSymbol}
					<div in:fade>
						<Logo
							src={$token?.icon}
							size="big"
							alt={replacePlaceholders($i18n.core.alt.logo, { $name: $token?.name ?? '' })}
						/>
					</div>
				{:else}
					<SkeletonLogo size="big" />
				{/if}
			</div>

			<Balance />
		</div>

		<ContextMenu />
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
		<Actions />
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
