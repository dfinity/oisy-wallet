<script lang="ts">
	import Address from '$lib/components/address/Address.svelte';
	import Balance from '$lib/components/dashboard/Balance.svelte';
	import Actions from '$lib/components/dashboard/Actions.svelte';
	import AddressBalanceZeroQRCode from '$lib/components/address/AddressBalanceZeroQRCode.svelte';
	import oisy from '$lib/assets/oisy.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { token } from '$lib/derived/token.derived';
	import HeaderHero from '$lib/components/layout/HeaderHero.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
</script>

<div class="hero">
	<HeaderHero />

	<article class="text-off-white rounded-lg pt-2 pb-4 px-4 mb-8 relative main">
		<div class="mb-6">
			<Alpha />
		</div>

		<div>
			<Img src={$token.icon ?? oisy} width="auto" height="64" />
		</div>

		<div class="flex items-end gap-1">
			<div style="min-width: 60%">
				<Address />

				<Balance />
			</div>

			<AddressBalanceZeroQRCode />
		</div>

		<Actions />
	</article>
</div>

<style lang="scss">
	@use '../../../../../../node_modules/@dfinity/gix-components/dist/styles/mixins/media';

	.hero {
		background: linear-gradient(61.79deg, #321469 62.5%, var(--color-misty-rose) 100%);

		--alpha-color: var(--color-grey);

		@include media.min-width(xlarge) {
			article {
				margin-top: -72px;
			}
		}
	}
</style>
