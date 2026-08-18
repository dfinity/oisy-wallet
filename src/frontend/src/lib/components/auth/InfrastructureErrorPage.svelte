<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import IconAlertTriangle from '$lib/components/icons/lucide/IconAlertTriangle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Collapsible from '$lib/components/ui/Collapsible.svelte';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { infrastructureError } from '$lib/stores/infrastructure-error.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	const description = $derived(replaceOisyPlaceholders($i18n.init.unavailable.description));

	const operation = $derived(
		replacePlaceholders($i18n.init.unavailable.operation, {
			$operation: $infrastructureError?.operation ?? ''
		})
	);

	const detail = $derived($infrastructureError?.detail);

	const handleReload = () => {
		window.location.reload();
	};

	const handleLogout = async () => {
		await signOut({
			resetUrl: true,
			source: 'infrastructure-error-page'
		});
	};
</script>

<div class="fixed inset-0 z-4 flex h-full w-full flex-col bg-page" data-app-view>
	<!-- Scrollable, and centred only when it fits: expanding the technical details can make the card
	     taller than a short or mobile viewport, and a fixed `h-screen` centre would then push the
	     buttons off-screen with no way to reach them. -->
	<div class="flex min-h-full flex-col items-center justify-center overflow-y-auto px-4 py-8">
		<div
			class="flex w-full max-w-md flex-col content-center items-center justify-center gap-5 rounded-4xl bg-surface p-6 text-center text-primary shadow-lg sm:p-8"
			data-tid="infrastructure-error-page"
		>
			<OisyWalletLogoLink />

			<div class="my-6 flex flex-col items-center">
				<span class="mb-4 text-warning-primary"><IconAlertTriangle size="40" /></span>

				<h2 class="mb-2 text-2xl font-semibold">{$i18n.init.unavailable.title}</h2>
				<span class="text-tertiary">{description}</span>
			</div>

			<div class="w-full">
				<div class="mb-3 w-full">
					<Button fullWidth onclick={handleReload} testId="infrastructure-error-reload">
						{$i18n.init.unavailable.reload}
					</Button>
				</div>

				<Button
					colorStyle="secondary-light"
					fullWidth
					innerStyleClass="items-center justify-center"
					onclick={handleLogout}
					testId="infrastructure-error-logout"
					transparent
				>
					{$i18n.init.unavailable.logout}
					<IconLogout />
				</Button>
			</div>

			<!-- `span` / `div` rather than `p` throughout: gix ships unlayered global `p` rules, and
			     unlayered CSS wins over Tailwind's `@layer utilities` regardless of specificity, so
			     `text-xs` and the muted colour would silently not apply on a paragraph. -->
			<span class="text-xs text-tertiary">
				{$i18n.init.unavailable.logout_hint}
			</span>

			<div class="w-full text-left">
				<Collapsible maxContentHeight={160} testId="infrastructure-error-details">
					{#snippet header()}
						<span class="text-sm font-semibold">{$i18n.init.unavailable.details}</span>
					{/snippet}

					<div class="mb-2 break-words text-xs text-tertiary">{operation}</div>

					{#if notEmptyString(detail)}
						<div class="break-words text-xs text-tertiary">{detail}</div>
					{/if}
				</Collapsible>
			</div>
		</div>
	</div>
</div>
