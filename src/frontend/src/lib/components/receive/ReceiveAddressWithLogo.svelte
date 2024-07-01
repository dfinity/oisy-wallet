<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Card from '$lib/components/ui/Card.svelte';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Logo from '$lib/components/ui/Logo.svelte';

	export let token: Token;
	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
</script>

<div class="flex gap-8 justify-between">
	<Card>
		<slot />

		<Logo
			slot="icon"
			color="white"
			src={token.network.icon}
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.network.name })}
			size="medium"
		/>

		<span class="break-all" slot="description">
			{shortenWithMiddleEllipsis(address)}

			<slot name="notes" />
		</span>
	</Card>

	<ReceiveActions on:click {address} {qrCodeAriaLabel} {copyAriaLabel} />
</div>
