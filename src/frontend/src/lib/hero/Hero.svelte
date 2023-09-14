<script lang="ts">
	import Address from '$lib/components/address/Address.svelte';
	import Balance from '$lib/hero/Balance.svelte';
	import Actions from '$lib/hero/Actions.svelte';
	import AddressQRCodeHero from '$lib/components/address/AddressQRCodeHero.svelte';
	import oisy from '$lib/assets/oisy.svg';
	import { token } from '$lib/derived/token.derived';
	import HeaderHero from '$lib/components/layout/HeaderHero.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { isRouteTransactions } from '$lib/utils/nav.utils';
	import { erc20TokensInitialized } from '$lib/derived/erc20.derived';
	import BorderedImg from '$lib/components/ui/BorderedImg.svelte';

	let route: 'tokens' | 'dashboard' = 'dashboard';
	$: route = isRouteTransactions($page) ? 'tokens' : 'dashboard';

	let displayTokens = false;
	$: displayTokens = route === 'tokens' && $erc20TokensInitialized;
</script>

<div class="hero">
	<HeaderHero />

	<article class="text-off-white rounded-lg pt-2 pb-4 px-4 mb-8 relative main">
		<div class="mb-6">
			<Alpha />
		</div>

		<div class="icon flex items-center" class:tokens={route === 'tokens'}>
			{#if displayTokens}
				<div in:fade style="margin: auto 0">
					<BorderedImg
						src={$token.icon ?? oisy}
						width="auto"
						height="96px"
						alt={`${$token.name} logo`}
						borderColor="off-white"
					/>
				</div>
			{/if}
		</div>

		<div
			class="flex flex-col md:flex-row md:items-end justify-between gap-1 balance"
			class:tokens={route === 'tokens'}
		>
			<div>
				<Address />

				{#if route === 'tokens'}
					<Balance />
				{/if}
			</div>

			{#if route === 'dashboard'}
				<AddressQRCodeHero />
			{/if}
		</div>

		<Actions send={route === 'tokens'} />
	</article>
</div>

<style lang="scss">
	@use '../../../../../node_modules/@dfinity/gix-components/dist/styles/mixins/media';

	.hero {
		background: linear-gradient(61.79deg, #321469 62.5%, var(--color-misty-rose) 100%);

		--alpha-color: var(--color-grey);

		@include media.min-width(xlarge) {
			article {
				margin-top: -72px;
			}
		}
	}

	.icon {
		@include media.min-width(small) {
			min-height: 70px;

			&.tokens {
				min-height: 122px;
			}
		}
	}

	.balance {
		@include media.min-width(small) {
			min-height: 160px;

			&.tokens {
				min-height: 108px;
			}
		}
	}
</style>
