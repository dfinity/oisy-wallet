<script lang="ts">
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address, OptionAddress } from '$lib/types/address';
	import type { Token } from '$lib/types/token';

	export let address: OptionAddress<Address>;
	export let addressLabel: string | undefined = undefined;
	export let addressToken: Token | undefined;
	export let testId: string | undefined = undefined;
	export let copyButtonTestId: string | undefined = undefined;
</script>

<p class="text-center font-bold">{addressLabel ?? $i18n.wallet.text.address}:</p>
<p class="mb-4 px-2 text-center font-normal">
	<output class="break-all" data-tid={testId}>{address}</output><Copy
		inline
		value={address ?? ''}
		text={$i18n.wallet.text.address_copied}
		testId={copyButtonTestId}
	/>
</p>

<ReceiveQRCode address={address ?? ''} {addressToken} />
