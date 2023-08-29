<script lang="ts">
	import Address from '$lib/components/address/Address.svelte';
	import Balance from '$lib/components/dashboard/Balance.svelte';
	import Actions from '$lib/components/dashboard/Actions.svelte';
	import AddressBalanceZeroQRCode from '$lib/components/address/AddressBalanceZeroQRCode.svelte';
	import oisy from '$lib/assets/oisy.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { token } from '$lib/derived/token.derived';

	$: console.log($token);
</script>

<article
	class="bg-deep-violet text-ghost-white rounded-lg pt-8 pb-4 px-4 my-8 md:mt-4 relative"
	style="min-height: 260px"
>
	<div class="absolute" style="top: -3rem; left: 2rem;">
		<Img src={$token.icon ?? oisy} width="109" height="142" />
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
