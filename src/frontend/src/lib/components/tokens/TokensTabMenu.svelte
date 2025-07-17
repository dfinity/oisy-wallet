<script lang="ts">
	import ButtonTab from '$lib/components/ui/ButtonTab.svelte';
	import { TokenType } from '$lib/enums/token-type';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		selectedTokenType: TokenType;
	}

	let {selectedTokenType = $bindable(TokenType.TOKEN)}: Props = $props();
</script>

<div class="flex items-center gap-4">
	<ButtonTab selected={selectedTokenType === TokenType.TOKEN} onClick={() => selectedTokenType = TokenType.TOKEN}>
		{$i18n.tokens.text.title}
	</ButtonTab>

	<ButtonTab selected={selectedTokenType === TokenType.NFT} onClick={() => selectedTokenType = TokenType.NFT}>
		{$i18n.nfts.text.title}
	</ButtonTab>
</div>
