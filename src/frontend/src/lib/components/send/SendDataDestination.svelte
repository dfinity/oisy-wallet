<script lang="ts">
	import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		destination: string;
	}

	let { destination }: Props = $props();
</script>

<WalletConnectModalValue label={$i18n.send.text.destination} ref="destination">
	<div class="flex flex-col gap-1">
		{destination}
		<ContactOrToken identifier={destination} />
	</div>
</WalletConnectModalValue>
