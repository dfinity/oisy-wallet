<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Card from '$lib/components/ui/Card.svelte';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;
	export let address: string;
	export let addressLabel: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
</script>

<div class="flex gap-8 mb-6 justify-between">
	<Card>
		{addressLabel}

		<TokenLogo slot="icon" color="white" {token} />

		<span class="break-all" slot="description">
			{shortenWithMiddleEllipsis(address)}
		</span>
	</Card>

	<ReceiveActions on:click {address} {qrCodeAriaLabel} {copyAriaLabel} />
</div>
