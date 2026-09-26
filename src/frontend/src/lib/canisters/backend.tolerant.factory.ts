import { idlFactory as idlCertifiedFactoryBackend } from '$declarations/backend/backend.factory.certified.did';
import { idlFactory as idlFactoryBackend } from '$declarations/backend/backend.factory.did';
import { nonNullish } from '@dfinity/utils';
import { IDL } from '@icp-sdk/core/candid';

/**
 * `NetworkSettingsFor` keys the user's per-network settings. It is a closed candid variant, so a
 * profile carrying a key this frontend's generated bindings do not know cannot be decoded into
 * it. Because `UserProfile.settings` is an `opt`, candid does not fail on that — it degrades the
 * `opt` to null and the user silently loses *every* setting, not just the unknown one.
 *
 * Decoding the key as `IDL.Unknown` instead accepts any variant tag, so the settings survive and
 * the keys we do know still map. `IDL.Unknown` cannot be serialized, so this factory is only ever
 * safe for reads — `update_user_network_settings` must keep the generated factory.
 */

// Identify the variant structurally rather than by position, so a regenerated `.did` with a
// different field order still matches. `backend.tolerant.factory.spec.ts` fails loudly if these
// markers ever stop identifying it.
const NETWORK_SETTINGS_FOR_MARKERS = [
	'InternetComputer',
	'BitcoinMainnet',
	'EthereumMainnet',
	'SolanaMainnet'
];

type FactoryIdl = Parameters<IDL.InterfaceFactory>[0]['IDL'];

const isNetworkSettingsFor = (fields: Record<string, IDL.Type>): boolean =>
	NETWORK_SETTINGS_FOR_MARKERS.every((marker) => marker in fields);

const patchVariant = ({
	idl,
	transform
}: {
	idl: FactoryIdl;
	transform: (fields: Record<string, IDL.Type>) => IDL.Type | undefined;
}): FactoryIdl => {
	// Inherit from the module namespace so every other constructor stays untouched.
	const patched: FactoryIdl = Object.create(idl);

	patched.Variant = (fields: Record<string, IDL.Type>) =>
		(transform(fields) ?? idl.Variant(fields)) as ReturnType<typeof idl.Variant>;

	return patched;
};

const toTolerantFactory =
	(factory: IDL.InterfaceFactory): IDL.InterfaceFactory =>
	({ IDL: idl }) =>
		factory({
			IDL: patchVariant({
				idl,
				transform: (fields) => (isNetworkSettingsFor(fields) ? idl.Unknown : undefined)
			})
		});

export const tolerantIdlFactoryBackend = toTolerantFactory(idlFactoryBackend);
export const tolerantIdlCertifiedFactoryBackend = toTolerantFactory(idlCertifiedFactoryBackend);

/**
 * The `NetworkSettingsFor` names these bindings were generated with, read back out of the factory
 * itself so it cannot drift from the declarations. A tolerantly decoded key is matched against
 * these by candid hash; anything left over is a network the backend has and we do not.
 */
/**
 * The `NetworkSettingsFor` names these bindings were generated with, read back out of the factory
 * itself so it cannot drift from the declarations. A tolerantly decoded key is matched against
 * these by candid hash; anything left over is a network the backend has and we do not.
 */
let cachedNames: string[] | undefined;

export const networkSettingsForNames = (): string[] => {
	if (nonNullish(cachedNames)) {
		return cachedNames;
	}

	const names: string[] = [];

	idlFactoryBackend({
		IDL: patchVariant({
			idl: IDL,
			transform: (fields) => {
				if (isNetworkSettingsFor(fields)) {
					names.push(...Object.keys(fields));
				}

				return undefined;
			}
		})
	});

	cachedNames = names;

	return names;
};
