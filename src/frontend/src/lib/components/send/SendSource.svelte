<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ContactWithAvatar from '$lib/components/contact/ContactWithAvatar.svelte';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import type { OptionToken } from '$lib/types/token';
	import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';

	export let token: OptionToken;
	export let balance: OptionBalance;
	export let source: string;
	export let exchangeRate: number | undefined = undefined;

	let contact: ContactUi | undefined;
	$: contact = getContactForAddress({ addressString: source, contactList: $contacts });

	let contactAddress: ContactAddressUi | undefined;
	$: contactAddress = filterAddressFromContact({ contact, address: source });
</script>

<WalletConnectModalValue label={$i18n.send.text.balance} ref="balance">
	{#if nonNullish(token)}
		<ExchangeAmountDisplay
			amount={balance ?? ZERO}
			decimals={token.decimals}
			{exchangeRate}
			symbol={token.symbol}
		/>
	{:else}
		&ZeroWidthSpace;
	{/if}
</WalletConnectModalValue>

<WalletConnectModalValue label={$i18n.send.text.source} ref="source">
	<div class="flex flex-col gap-1">
		{source}
		{#if nonNullish(contact)}
			<ContactWithAvatar {contact} {contactAddress} />
		{/if}
	</div>
</WalletConnectModalValue>
