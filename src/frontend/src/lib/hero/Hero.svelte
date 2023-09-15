<script lang="ts">
	import Actions from '$lib/hero/Actions.svelte';
	import HeaderHero from '$lib/components/layout/HeaderHero.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import { page } from '$app/stores';
	import { isRouteTransactions } from '$lib/utils/nav.utils';
	import { erc20TokensInitialized } from '$lib/derived/erc20.derived';

	let route: 'tokens' | 'dashboard' = 'dashboard';
	$: route = isRouteTransactions($page) ? 'tokens' : 'dashboard';

	let displayTokens = false;
	$: displayTokens = route === 'tokens' && $erc20TokensInitialized;
</script>

<div class="hero">
	<HeaderHero />

	<article class="text-off-white rounded-lg pt-1 sm:pt-3 pb-2 px-4 mb-8 relative main">
		<Alpha />

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
				margin-top: -80px;
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
