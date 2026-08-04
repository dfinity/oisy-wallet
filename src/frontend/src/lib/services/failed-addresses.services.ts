import { networks } from '$lib/derived/networks.derived';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NetworkId } from '$lib/types/network';
import { networksDependingOnFailedAddresses } from '$lib/utils/address.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { debounce } from '@dfinity/utils';
import { get } from 'svelte/store';

// Long enough to batch the three chains, which are loaded concurrently and settle within a tick of
// each other, but short enough that the toast still reads as a response to what just happened.
const REPORT_DEBOUNCE_MS = 250;

const reportNow = () => {
	const pending = get(failedAddresses).filter(({ reported }) => !reported);

	if (pending.length === 0) {
		return;
	}

	const pendingNetworkIds = pending.map(({ networkId }) => networkId);

	// Marked before showing, so a retry that fails while this toast is still on screen cannot
	// queue a duplicate.
	failedAddresses.markReported(pendingNetworkIds);

	// Expanded from the *pending* failures only. Expanding the whole store instead would re-list
	// networks the user was already told about, so a second chain failing later would repeat the
	// first one's networks.
	//
	// Names rather than ids: a user reads "Bitcoin", not "BTC". Ordered like the network selector,
	// so the list matches what they already recognise.
	const affected = networksDependingOnFailedAddresses({
		networks: get(networks),
		failedNetworkIds: pendingNetworkIds
	});

	if (affected.length === 0) {
		return;
	}

	const { init } = get(i18n);

	toastsError({
		msg: {
			// Singular / plural follows the number of failed *addresses*, not networks: the Ethereum
			// address alone covers five networks, so "your addresses for Ethereum, Base, …" would
			// claim five addresses where there is one.
			text: replacePlaceholders(
				pendingNetworkIds.length === 1
					? init.error.address_unavailable
					: init.error.addresses_unavailable,
				{ $networks: affected.map(({ name }) => name).join(', ') }
			)
		}
	});
};

/**
 * Show one toast naming every chain whose address failed, at most once per chain.
 *
 * Debounced rather than immediate for two reasons: the three chains load concurrently, so firing
 * per chain would stack up to three toasts for what is one event to the user; and `Loader.svelte`
 * retries a nullish address, so an undeduplicated toast would reappear on every retry of a
 * permanently failing chain.
 *
 * Deliberately carries no retry affordance — address derivation is local and deterministic, so
 * nothing the user does here changes the outcome.
 */
export const reportFailedAddresses = debounce(reportNow, REPORT_DEBOUNCE_MS);

export const recordFailedAddress = (networkId: NetworkId) => {
	failedAddresses.add(networkId);

	reportFailedAddresses();
};
