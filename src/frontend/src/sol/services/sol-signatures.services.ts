import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { last } from '$lib/utils/array.utils';
import { fetchSignatures } from '$sol/api/solana.api';
import { SOLANA_MAX_SKIPPED_SIGNATURE_PAGES } from '$sol/constants/sol.constants';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import type {
	GetSolSignaturesParams,
	GetSolTransactionsParams,
	SolSignaturesCursor,
	SolSignaturesPage
} from '$sol/types/sol-api';
import type {
	SolSignature,
	SolSignatureWithSources,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import {
	assertIsAddress,
	signature,
	address as solAddress,
	type Address,
	type Signature
} from '@solana/kit';

const findSignatureSources = async ({
	wallet,
	tokensList
}: {
	wallet: Address;
	tokensList: GetSolSignaturesParams['tokensList'];
}): Promise<Address[]> => {
	const ataAddresses = await Promise.all(
		(tokensList ?? []).map(async ({ address: tokenAddress, owner: tokenOwnerAddress }) => {
			assertIsAddress(tokenAddress);
			assertIsAddress(tokenOwnerAddress);

			const [ataAddress] = await findAssociatedTokenPda({
				owner: wallet,
				tokenProgram: solAddress(tokenOwnerAddress),
				mint: solAddress(tokenAddress)
			});

			return ataAddress;
		})
	);

	return [...new Set([wallet, ...ataAddresses])];
};

const mergeSignatureSources = (
	signatures: SolSignatureWithSources[]
): Map<SolSignature['signature'], SolSignatureWithSources> =>
	signatures.reduce((acc, solSignature) => {
		const existing = acc.get(solSignature.signature);

		acc.set(
			solSignature.signature,
			isNullish(existing)
				? solSignature
				: { ...existing, sources: [...new Set([...existing.sources, ...solSignature.sources])] }
		);

		return acc;
	}, new Map<SolSignature['signature'], SolSignatureWithSources>());

const newestSlot = (slots: SolSignature['slot'][]): SolSignature['slot'] | undefined =>
	slots.reduce<SolSignature['slot'] | undefined>(
		(acc, slot) => (isNullish(acc) || slot > acc ? slot : acc),
		undefined
	);

/**
 * Pages through the signatures without an error of a wallet and of the associated token account
 * of each token in `tokensList`, as one list: unique signatures, newest first, each tagged with
 * every source whose history holds it.
 *
 * Newest first means by slot. Within a slot, only the order in which one source returned
 * signatures on one page is kept: across sources, or across pages, their position in the block is
 * not known, so nothing may rely on the order of signatures that share a slot.
 *
 * A page ends at the cut: the newest of the oldest signatures of the sources that have not reached
 * their end. Such a source may still hold signatures older than its oldest one, even in the same
 * slot, so a page returns only the signatures strictly newer than the cut, and the cursor keeps the
 * others. Paging to the end yields every source's history, with no holes and no duplicates.
 *
 * Pass the returned cursor back to get the next page. Only a missing cursor means the end: a page
 * can be empty while a source is still paging through the cut slot. A cursor is only valid for the
 * sources it was made for, so start again without one when the token list changes. A failed lookup
 * rejects the page, so that the caller retries rather than taking a failure for the end.
 */
export const getSolSignatures = async ({
	address,
	network,
	tokensList,
	limit = Number(WALLET_PAGINATION),
	cursor
}: GetSolSignaturesParams): Promise<SolSignaturesPage> => {
	const sources = await findSignatureSources({ wallet: solAddress(address), tokensList });

	const { before = {}, exhausted = [], pending = [] } = cursor ?? {};

	const activeSources = sources.filter((source) => !exhausted.includes(source));

	// A source whose oldest signature is older than the cut already holds everything the next page
	// can return from it, so only the sources at the cut, or never asked yet, are asked again.
	const previousCutSlot = newestSlot(
		activeSources.map((source) => before[source]?.slot).filter(nonNullish)
	);

	// `Promise.all` subscribes to every lookup, so a second failure does not surface as an unhandled
	// rejection once the first one has rejected the page.
	const pages = await Promise.all(
		activeSources
			.filter((source) => isNullish(before[source]) || before[source].slot === previousCutSlot)
			.map(async (source) => ({
				source,
				signatures: await fetchSignatures({
					network,
					wallet: source,
					before: before[source]?.signature,
					limit
				})
			}))
	);

	const merged = mergeSignatureSources([
		...pending,
		...pages.flatMap(({ source, signatures }) =>
			signatures.map((solSignature) => ({ ...solSignature, sources: [source] }))
		)
	]);

	// A stable sort: signatures one source returned on this page keep their order within a slot.
	// Nothing orders signatures of the same slot across sources (see the doc comment).
	const newestFirst = [...merged.values()].sort(({ slot: slotA }, { slot: slotB }) =>
		slotA === slotB ? 0 : slotA > slotB ? -1 : 1
	);

	const nextExhausted = [
		...exhausted,
		...pages.filter(({ signatures }) => signatures.length < limit).map(({ source }) => source)
	];

	const nextBefore = pages.reduce<SolSignaturesCursor['before']>((acc, { source, signatures }) => {
		const oldest = last(signatures);

		return nonNullish(oldest)
			? { ...acc, [source]: { signature: oldest.signature, slot: oldest.slot } }
			: acc;
	}, before);

	const remainingSources = activeSources.filter((source) => !nextExhausted.includes(source));

	const cutSlot = newestSlot(
		remainingSources.map((source) => nextBefore[source]?.slot).filter(nonNullish)
	);

	// Every source has reached the end of its history.
	if (isNullish(cutSlot)) {
		return { signatures: newestFirst };
	}

	return {
		signatures: newestFirst.filter(({ slot }) => slot > cutSlot),
		cursor: {
			before: remainingSources.reduce<SolSignaturesCursor['before']>(
				(acc, source) => ({ ...acc, [source]: nextBefore[source] }),
				{}
			),
			exhausted: nextExhausted,
			pending: newestFirst.filter(({ slot }) => slot <= cutSlot)
		}
	};
};

/**
 * Fetches transactions without an error for a given wallet address.
 */
export const getSolTransactions = async ({
	address,
	network,
	tokenAddress,
	tokenOwnerAddress,
	before,
	limit = Number(WALLET_PAGINATION),
	exitIfFirstSignatureMatches
}: GetSolTransactionsParams): Promise<SolTransactionUi[]> => {
	if (nonNullish(tokenAddress)) {
		assertIsAddress(tokenAddress);
	}

	if (nonNullish(tokenOwnerAddress)) {
		assertIsAddress(tokenOwnerAddress);
	}

	const [relevantAddress] =
		nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
			? await findAssociatedTokenPda({
					owner: solAddress(address),
					tokenProgram: solAddress(tokenOwnerAddress),
					mint: solAddress(tokenAddress)
				})
			: [address];

	const wallet = solAddress(relevantAddress);

	let cursor: Signature | undefined = nonNullish(before) ? signature(before) : undefined;

	// A page of signatures can map to nothing the user can see: a lookup on an associated token
	// account answers with transactions that never moved anything of theirs. The caller's next
	// cursor is the oldest transaction it holds, so stopping on such a page would have it ask for
	// that very page again, and the history behind it would stay out of reach. Step over it here.
	for (let page = 0; page <= SOLANA_MAX_SKIPPED_SIGNATURE_PAGES; page++) {
		const signatures: SolSignature[] = await fetchSignatures({
			network,
			wallet,
			before: cursor,
			limit
		});

		// No signature older than the cursor: this is the end of the history, whatever mapped.
		if (signatures.length === 0) {
			return [];
		}

		if (
			page === 0 &&
			isNullish(before) &&
			nonNullish(exitIfFirstSignatureMatches) &&
			String(signatures[0].signature) === exitIfFirstSignatureMatches
		) {
			return [];
		}

		const transactions = await signatures.reduce(
			async (accPromise, signature) => {
				const acc = await accPromise;
				const parsedTransactions = await fetchSolTransactionsForSignature({
					signature,
					network,
					address,
					tokenAddress,
					tokenOwnerAddress
				});

				return [...acc, ...parsedTransactions];
			},
			Promise.resolve([] as SolTransactionUi[])
		);

		if (transactions.length > 0) {
			return transactions;
		}

		cursor = last(signatures)?.signature;

		if (isNullish(cursor)) {
			return [];
		}
	}

	return [];
};
