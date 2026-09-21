import { TEST } from '$lib/constants/app.constants';
import { notEmptyString } from '@dfinity/utils';

/**
 * XRPL JSON-RPC endpoint.
 *
 * Here rather than in `networks.xrp.env.ts` because this is a provider credential, and every
 * other one in this repo lives under `env/rest/`. It is the odd one in holding a whole URL where
 * the others hold a key and compose it onto a hostname kept in code — QuickNode's Solana endpoint
 * is the closest comparison. Splitting this the same way means committing the XRPL hostname and
 * re-issuing the deployment secrets as bare tokens, so it is deliberately left for later; the
 * value is a build-time constant inlined into the published bundle either way.
 *
 * There is no fallback endpoint. A build without this variable has no XRPL endpoint and
 * `xrpHttpRpcUrl` throws, exactly as a build without an Alchemy or QuickNode key fails its
 * requests. The public XRP Ledger Foundation cluster used to stand in on non-user-facing builds,
 * which made a missing endpoint look like a working one and pointed sustained traffic at a
 * cluster [xrpl.org](https://xrpl.org/docs/tutorials/public-servers) documents as not for it.
 *
 * `TEST` resolves to `undefined` unconditionally, and is checked FIRST rather than folded in with
 * the variable: a spec that forgets to mock an RPC call must fail by name instead of reaching a
 * real endpoint, and a developer with this variable in their own env would otherwise get a live
 * provider out of exactly that omission. Any spec that needs an endpoint mocks this module.
 *
 * An empty value counts as unconfigured, not as a configured endpoint. `??` alone would keep
 * `''`, which is not nullish: `xrpHttpRpcUrl` would pass its own check and return an empty URL,
 * and every request would resolve against the app's own origin instead of failing. A var that is
 * declared but unset is the normal case for both of the ways this arrives — a `.env` copied from
 * `.env.example`, and a deployment secret that has not been created yet.
 */
export const XRP_RPC_HTTP_URL_MAINNET =
	!TEST && notEmptyString(import.meta.env.VITE_XRP_RPC_URL_MAINNET)
		? import.meta.env.VITE_XRP_RPC_URL_MAINNET
		: undefined;
