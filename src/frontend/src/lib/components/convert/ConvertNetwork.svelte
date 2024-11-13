<script lang="ts">
	import ConvertValue from '$lib/components/convert/ConvertValue.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	export let token: Token;
</script>

<ConvertValue>
	<slot slot="label" name="label" />

	<div class="flex" slot="main-value">
		<Logo
			color="off-white"
			src={token.network.iconBW}
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.network.name })}
		/><span class="ml-2">{token.network.name}</span>
	</div>
</ConvertValue>
