<script lang="ts">
	import IconAlertTriangle from '$lib/components/icons/lucide/IconAlertTriangle.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		text: string;
		acknowledged: boolean;
		testId?: string;
	}

	let { text, acknowledged = $bindable(), testId }: Props = $props();

	const uid = $props.id();

	const inputId = `wallet-connect-acknowledgement-${uid}`;
</script>

<!-- Orange and not red, as on the Solana review of programs OISY can't read: on these screens red
     means OISY will not sign, and this it will once the user confirms it. -->
<div
	class="mb-4 flex items-start gap-4 rounded-xl border border-warning-solid-alt bg-warning-subtle-30 px-4 py-3 text-sm font-medium sm:text-base"
	data-tid={testId}
>
	<div class="min-w-5 py-0 text-warning-primary sm:py-0.5">
		<IconAlertTriangle size="20" />
	</div>

	<div class="flex min-w-0 flex-col gap-3 text-primary">
		<!-- A live region: it is why Approve stays unusable until the box below is ticked. -->
		<p role="alert">{text}</p>

		<div class="flex items-start gap-3">
			<Checkbox checked={acknowledged} {inputId} onChange={() => (acknowledged = !acknowledged)} />

			<label class="block leading-snug" for={inputId}>
				{$i18n.wallet_connect.text.unread_programs_acknowledge}
			</label>
		</div>
	</div>
</div>
