<script lang="ts">
    import IconWalletConnectLogo from "$lib/components/icons/IconWalletConnectLogo.svelte";
</script>

<button on:click class="wallet-connect icon">
    <IconWalletConnectLogo />
    <span class="text-white font-bold text-xs"><slot /></span>
</button>
