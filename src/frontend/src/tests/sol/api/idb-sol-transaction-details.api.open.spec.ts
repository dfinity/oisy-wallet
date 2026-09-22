import { SolanaNetworks } from '$sol/types/network';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { IDBFactory } from 'fake-indexeddb';

// The suite mocks `idb-keyval` away for every spec. This one is about when a database comes into
// existence, so it runs against the real thing on `fake-indexeddb`.
vi.mock('idb-keyval', async () => await vi.importActual('idb-keyval'));

// Kept in a file of its own: the other spec opens the store in its `beforeEach`, and the assertion
// here is about a realm that has done nothing but load the module. Each case gets its own
// IndexedDB for the same reason — one that reads has created the database, which would otherwise
// decide the outcome of one that has not, and test order must never matter.
describe('idb-sol-transaction-details.api, before anything uses it', () => {
	const DB_NAME = 'oisy-sol-transaction-details';

	const databaseNames = async () => (await indexedDB.databases()).map(({ name }) => name);

	beforeEach(() => {
		vi.stubGlobal('indexedDB', new IDBFactory());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	// What broke sign-out. `signOut` deletes every `oisy-` database and, after the reload,
	// `displayAndCleanLogoutMsg` deletes them again — and a delete cannot proceed against an open
	// connection. `idb-keyval` opens lazily, so every other store had none before sign-in; this one
	// opened at module scope, on every page load including the landing page, so its delete was
	// blocked and the details of the ended session stayed behind.
	it('should not create the database when the module loads', async () => {
		vi.resetModules();

		await import('$sol/api/idb-sol-transaction-details.api');

		await expect(databaseNames()).resolves.not.toContain(DB_NAME);
	});

	it('should create it once something reads', async () => {
		vi.resetModules();

		const { getIdbSolTransactionDetail } = await import('$sol/api/idb-sol-transaction-details.api');

		await getIdbSolTransactionDetail({
			network: SolanaNetworks.mainnet,
			signature: { signature: mockSolSignature(), slot: 100n }
		});

		await expect(databaseNames()).resolves.toContain(DB_NAME);
	});
});
