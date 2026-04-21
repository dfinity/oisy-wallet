import { customEvmNetworksStore } from '$eth/stores/custom-evm-networks.store';
import type { CustomEvmNetwork } from '$eth/types/custom-network';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { Network } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

/**
 * Adapter: project a `CustomEvmNetwork` onto the shared `Network` shape.
 *
 * `CustomEvmNetwork` carries EVM-specific extras (`chainId`, `rpcUrl`,
 * `currencySymbol`, `iconUrl`) that the generic `networks` consumers do not
 * need. The mapping intentionally drops those fields and renames
 * `iconUrl` → `icon`; `NetworkSchema.icon` was relaxed to accept http(s)
 * URLs so user-supplied logos pass the shared validator.
 *
 * This is a pure structural conversion — it does not re-validate against
 * `NetworkSchema` because the source `CustomEvmNetwork` was already
 * validated at its boundaries (`add`/`update`/persistence load).
 */
const toNetwork = ({ id, name, env, explorerUrl, iconUrl }: CustomEvmNetwork): Network => ({
	id,
	name,
	env,
	explorerUrl,
	...(iconUrl !== undefined ? { icon: iconUrl } : {})
});

/**
 * Derived list of user-added custom EVM networks that the UI should surface
 * right now. The gating rule matches the rest of the app: testnets are hidden
 * unless the user has enabled them in settings. There is intentionally no
 * `userNetworks` hook yet — custom networks are explicitly opt-in (the user
 * added them), so we show them whenever they exist. A per-custom-network
 * enable toggle can be layered on top in a later iteration without changing
 * the adapter contract.
 */
export const enabledCustomEvmNetworks: Readable<Network[]> = derived(
	[customEvmNetworksStore, testnetsEnabled],
	([$customEvmNetworksStore, $testnetsEnabled]) =>
		$customEvmNetworksStore
			.filter(({ env }) => env === 'mainnet' || $testnetsEnabled)
			.map(toNetwork)
);
