<script lang="ts">
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';

	export let label: string | undefined;
	export let fallback = '';
	export let token: OptionToken;

	$: fallback = fallback.charAt(0).toUpperCase() + fallback.slice(1);

	let twinToken: Token | undefined;
	$: twinToken = (token as OptionIcCkToken)?.twinToken;
</script>

{replacePlaceholders(resolveText({ i18n: $i18n, path: label }) ?? fallback, {
	$twinToken: twinToken?.symbol ?? '',
	$twinNetwork: twinToken?.network.name ?? '',
	$ckToken: token?.symbol ?? ''
})}
