<script lang="ts">
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<MessageBox level="error" testId="wallet-connect-scam-warning">
	<span class="font-bold">{$i18n.wallet_connect.domain.security_risk}</span>
	{$i18n.wallet_connect.domain.security_risk_description}
</MessageBox>
