<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Card from '$lib/components/ui/Card.svelte';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { RECEIVE_TOKENS_MODAL_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';

	export let token: Token;
	export let address: string;
	export let qrCodeAriaLabel: string;
	export let copyAriaLabel: string;
	export let invisibleLogo = false;
	export let testId: string | undefined = undefined;
</script>

<div class="flex gap-8 justify-between mb-6" data-tid={testId}>
	<div class="grid grid-cols-[minmax(52px,auto),1fr] gap-4 content-center w-full">
		<div class="col-start-1">
			{#if !invisibleLogo}
				<Logo
					color="white"
					src={token.network.icon}
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.network.name })}
					size="medium"
				/>
			{/if}
		</div>

		<div class="col-start-2 content-center">
			<div class="flex flex-row justify-between">
				<Card noMargin>
					<slot />

					<span class="break-all" slot="description" data-tid={RECEIVE_TOKENS_MODAL_ADDRESS_LABEL}>
						{shortenWithMiddleEllipsis(address)}
					</span>
				</Card>

				<ReceiveActions on:click {address} {qrCodeAriaLabel} {copyAriaLabel} />
			</div>
			<slot name="notes" />
		</div>
	</div>
</div>
