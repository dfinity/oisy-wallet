<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProviderUi } from '$lib/types/provider-ui';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		provider: ProviderUi;
	}

	let { provider }: Props = $props();

	let { logo: logoSrc, name, cardTitle } = $derived(provider);
</script>

<div class="flex w-full flex-col">
	<LogoButton condensed={false} dividers={false} hover={true} rounded={false}>
		{#snippet logo()}
			<span class="mr-2 flex">
				<Logo
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
					color="white"
					size="lg"
					src={logoSrc}
				/>
			</span>
		{/snippet}

		{#snippet title()}
			<span>
				{resolveText({ i18n: $i18n, path: cardTitle })}
			</span>
		{/snippet}
	</LogoButton>
</div>
