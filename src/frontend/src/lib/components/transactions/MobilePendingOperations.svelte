<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { fungibleTokens } from '$lib/derived/tokens.derived';
	import type { MobileOperation } from '$lib/schema/mobile-operation.schema';
	import { loadMobileOperations } from '$lib/services/mobile-operation-journal.services';
	import {
		reconcileMobileEthSend,
		releaseMobileApproval,
		recoverMobileIcpSwap,
		MOBILE_RECOVERY_DELAY_MS
	} from '$lib/services/mobile-operation-recovery.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

	let operations = $state<MobileOperation[]>([]);
	let busy = $state(false);
	let unavailable = $state(false);
	let now = $state(Date.now());
	let refresh: () => Promise<void> = () => Promise.resolve();
	$effect(() => {
		const identity = $authIdentity;
		let active = true;
		let checking = false;
		operations = [];
		unavailable = false;
		refresh = async () => {
			if (!identity || !active || checking || document.visibilityState === 'hidden') {
				return;
			}
			checking = true;
			try {
				const loaded = await loadMobileOperations(identity);
				for (const operation of loaded) {
					if (!active) {
						return;
					}
					if (operation.kind === 'icpSwap') {
						await releaseMobileApproval({ identity, operation });
					}
					if (operation.kind === 'evmSend') {
						const outcome = await reconcileMobileEthSend({ identity, operation }).catch(
							() => 'unknown'
						);
						if (active && (outcome === 'reverted' || outcome === 'replaced')) {
							toastsError({ msg: { text: $i18n.send.text.mobile_not_confirmed } });
						}
					}
				}
				const remaining = await loadMobileOperations(identity);
				if (active) {
					operations = remaining;
					unavailable = false;
					now = Date.now();
				}
			} catch {
				if (active) {
					unavailable = true;
				}
			} finally {
				checking = false;
			}
		};
		untrack(() => void refresh());
		const timer = setInterval(() => void refresh(), 15_000);
		return () => {
			active = false;
			clearInterval(timer);
		};
	});
	const recover = async (operation: MobileOperation) => {
		if (busy || !$authIdentity || operation.kind !== 'icpSwap') {
			return;
		}
		busy = true;
		try {
			await recoverMobileIcpSwap({ identity: $authIdentity, operation, tokens: $fungibleTokens });
		} catch {
			toastsError({ msg: { text: $i18n.swap.text.mobile_no_recovery_balance } });
		} finally {
			busy = false;
			await refresh();
		}
	};
</script>

{#if unavailable}
	<MessageBox level="warning">{$i18n.send.text.mobile_recovery_unavailable}</MessageBox>
{/if}
{#each operations as operation (operation.id)}
	<section class="my-3" aria-label={$i18n.send.text.mobile_pending_title}>
		<MessageBox level="info">
			<p class="font-semibold"
				>{$i18n.send.text.mobile_pending_title} · {operation.kind === 'evmSend'
					? operation.symbol
					: `${operation.sourceSymbol} → ${operation.destinationSymbol}`}</p
			>
			<p class="mt-2"
				>{operation.kind === 'evmSend'
					? $i18n.send.text.mobile_pending
					: operation.stage === 'recovered'
						? $i18n.swap.text.mobile_recovered
						: $i18n.swap.text.mobile_pending}</p
			>
			<div class="mt-3 flex flex-wrap gap-2">
				<Button colorStyle="secondary" disabled={busy} onclick={() => refresh()}
					>{$i18n.send.text.mobile_check_status}</Button
				>
				{#if operation.kind === 'icpSwap'}
					<Button
						disabled={busy || now - operation.updatedAt < MOBILE_RECOVERY_DELAY_MS}
						onclick={() => recover(operation)}>{$i18n.swap.text.mobile_recover}</Button
					>
				{/if}
			</div>
		</MessageBox>
	</section>
{/each}
