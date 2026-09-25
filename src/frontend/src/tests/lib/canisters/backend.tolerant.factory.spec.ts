import { idlFactory as idlFactoryBackend } from '$declarations/backend/backend.factory.did';
import {
	networkSettingsForNames,
	tolerantIdlFactoryBackend
} from '$lib/canisters/backend.tolerant.factory';
import { ZERO } from '$lib/constants/app.constants';
import { candidFieldHash } from '$lib/utils/candid.utils';
import { resolveNetworkSettingsKeys } from '$lib/utils/user-networks.utils';
import { IDL } from '@icp-sdk/core/candid';

const retTypes = (service: IDL.ServiceClass): IDL.Type[] =>
	service._fields.find(([name]) => name === 'get_user_profile')?.[1].retTypes ?? [];

// The same generated factory with one extra network key: what a backend one release ahead of
// these bindings returns.
const futureService = ((): IDL.ServiceClass => {
	const patched: typeof IDL = Object.create(IDL);
	patched.Variant = ((fields: Record<string, IDL.Type>) =>
		'InternetComputer' in fields && 'SolanaMainnet' in fields
			? IDL.Variant({ ...fields, FutureNetworkMainnet: IDL.Null })
			: IDL.Variant(fields)) as typeof IDL.Variant;

	return idlFactoryBackend({ IDL: patched });
})();

const encodeProfile = (networks: [unknown, { enabled: boolean; is_testnet: boolean }][]) =>
	IDL.encode(retTypes(futureService), [
		{
			Ok: {
				agreements: [],
				version: [1n],
				created_timestamp: ZERO,
				updated_timestamp: ZERO,
				settings: [
					{
						networks: { networks, testnets: { show_testnets: false } },
						notifications: [],
						dapp: { dapp_carousel: { hidden_dapp_ids: [] } },
						experimental_features: { experimental_features: [] },
						transactions: []
					}
				]
			}
		}
	]);

const SETTINGS = { enabled: true, is_testnet: false };

describe('backend.tolerant.factory', () => {
	describe('networkSettingsForNames', () => {
		const names = networkSettingsForNames();

		// If a regenerated `.did` renames these, the variant stops being recognised and the
		// tolerant decode silently turns back into the broken one. Fail here instead.
		it('should find the NetworkSettingsFor variant in the generated factory', () => {
			expect(names.length).toBeGreaterThan(0);

			expect(names).toEqual(expect.arrayContaining(['InternetComputer', 'SolanaMainnet']));
		});

		it('should return every key the bindings know', () => {
			expect(names).toEqual(expect.arrayContaining(['BitcoinMainnet', 'EthereumMainnet']));

			expect(new Set(names).size).toBe(names.length);
		});
	});

	describe('decoding a profile from a newer backend', () => {
		const bytes = encodeProfile([
			[{ SolanaMainnet: null }, SETTINGS],
			[{ FutureNetworkMainnet: null }, SETTINGS]
		]);

		// The bug this factory exists for: `settings` is an `opt`, so candid does not throw — it
		// drops the whole record and the user loses every setting they ever saved.
		it('should lose all settings with the generated factory', () => {
			const [result] = IDL.decode(retTypes(idlFactoryBackend({ IDL })), bytes) as [
				{ Ok: { settings: unknown[] } }
			];

			expect(result.Ok.settings).toEqual([]);
		});

		it('should keep the settings with the tolerant factory', () => {
			const [result] = IDL.decode(retTypes(tolerantIdlFactoryBackend({ IDL })), bytes) as [
				{ Ok: { settings: { networks: { networks: unknown[] } }[] } }
			];

			expect(result.Ok.settings).toHaveLength(1);

			expect(result.Ok.settings[0].networks.networks).toHaveLength(2);
		});

		it('should resolve the known key and report only the unknown one', () => {
			const [result] = IDL.decode(retTypes(tolerantIdlFactoryBackend({ IDL })), bytes) as [
				{ Ok: { settings: { networks: { networks: [object, typeof SETTINGS][] } }[] } }
			];

			const { networks, unresolved } = resolveNetworkSettingsKeys({
				networks: result.Ok.settings[0].networks.networks,
				names: networkSettingsForNames()
			});

			expect(networks).toEqual([[{ SolanaMainnet: null }, SETTINGS]]);

			expect(unresolved).toEqual([`_${candidFieldHash('FutureNetworkMainnet')}_`]);
		});
	});
});
