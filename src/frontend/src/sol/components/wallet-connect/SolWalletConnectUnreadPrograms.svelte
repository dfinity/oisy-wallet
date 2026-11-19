<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAlertTriangle from '$lib/components/icons/lucide/IconAlertTriangle.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import SolAddressActions from '$sol/components/wallet-connect/SolAddressActions.svelte';
	import type { SolUnreadProgram } from '$sol/types/sol-simulation';

	interface Props {
		programs: SolUnreadProgram[];
		network: Network;
		acknowledged: boolean;
	}

	let { programs, network, acknowledged = $bindable() }: Props = $props();

	const uid = $props.id();

	const inputId = `sol-wallet-connect-unread-programs-${uid}`;
</script>

<!-- Orange and not red: on this screen red always means OISY will not sign, and this it will once
     the user confirms it. A stronger fill than the notice about instructions OISY cannot decode,
     with a border and a triangle rather than the round icon, since that one asks nothing of the
     user and this one holds the button. -->
<div
	class="mb-4 flex items-start gap-4 rounded-xl border border-warning-solid-alt bg-warning-subtle-30 px-4 py-3 text-sm font-medium sm:text-base"
	data-tid="unread-programs"
>
	<div class="min-w-5 py-0 text-warning-primary sm:py-0.5">
		<IconAlertTriangle size="20" />
	</div>

	<div class="flex min-w-0 flex-col gap-3 text-primary">
		<!-- A live region for the reason the refusals carry one: it arrives once the decode settles, and
		     it is why Approve stays unusable until the box below is ticked. -->
		<p role="alert">
			{programs.length === 1
				? $i18n.wallet_connect.text.unread_programs_one
				: $i18n.wallet_connect.text.unread_programs_other}
		</p>

		<ul class="flex flex-col gap-1">
			{#each programs as { address, name } (address)}
				<li class="flex flex-wrap items-center gap-x-2" data-tid="unread-program">
					{#if nonNullish(name)}
						<span class="font-bold break-all">{name}</span>
					{/if}

					<span class="flex items-center gap-1 text-secondary">
						{shortenWithMiddleEllipsis({ text: address })}

						<SolAddressActions {address} {network} />
					</span>
				</li>
			{/each}
		</ul>

		<div class="flex items-start gap-3">
			<Checkbox checked={acknowledged} {inputId} onChange={() => (acknowledged = !acknowledged)} />

			<label class="block leading-snug" for={inputId}>
				{$i18n.wallet_connect.text.unread_programs_acknowledge}
			</label>
		</div>
	</div>
</div>
