<script lang="ts">
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';

	export let label: string | undefined;
	export let fallback = '';

	let twinToken: Token | undefined;
	$: twinToken = ($token as OptionIcCkToken)?.twinToken;
</script>

{replacePlaceholders(resolveText({ i18n: $i18n, path: label }) ?? fallback, {
	$twinToken: twinToken?.symbol ?? '',
	$twinNetwork: twinToken?.network.name ?? ''
})}
