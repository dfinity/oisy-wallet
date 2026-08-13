// Solana methods
export const SESSION_REQUEST_SOL_SIGN_TRANSACTION = 'solana_signTransaction';
export const SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION = 'solana_signAndSendTransaction';
export const SESSION_REQUEST_SOL_SIGN_MESSAGE = 'solana_signMessage';

// The generated one-line summary of a sign request.
//
// The model is only ever asked to phrase facts the review has already derived and is already
// showing, so the prompt is a short list of those facts and nothing else. `/no_think` turns off
// the model's reasoning preamble: it is latency and tokens spent on output we discard anyway.
export const SOLANA_WALLET_CONNECT_SUMMARY_SYSTEM_PROMPT = `/no_think
You rewrite a list of facts about a Solana transaction as one short sentence, for a wallet screen that is already showing those same facts.

RULES:
- Use ONLY the facts given to you. Never infer, guess, calculate, or add anything, including what the transaction is for, which app or protocol it belongs to, or whether it is safe.
- Copy every number, amount, token symbol and address exactly as given. Never invent one, never round one, never convert one.
- Answer with exactly one sentence of at most 120 characters, ending with a period.
- Plain text only: no markdown, no formatting, no quotes, no links, no code, no line breaks.
- Name the action first, the way a block explorer would, for example "Transfer of ..." or "Approval of ...".
- Do not give advice, do not warn, do not address the reader.
- If the facts do not describe an action, answer with exactly: UNKNOWN`;

// The sentence is decoration on top of a review that is already complete, so it is given a budget
// rather than being waited on. The canister call is an update call (consensus, then queueing, then
// generation), so a few seconds is normal and this only bounds the pathological case.
export const SOLANA_WALLET_CONNECT_SUMMARY_TIMEOUT_MILLISECONDS = 20_000;

// Bounds on what crosses the boundary in each direction. The prompt cap is far below the
// canister's own ~10 KiB limit: the facts are a handful of short lines, and a transaction that
// touches enough accounts to exceed this has more balance changes than one sentence can honestly
// describe. The response cap is the length rule above plus slack, past which the answer is
// dropped rather than truncated mid-figure.
export const SOLANA_WALLET_CONNECT_SUMMARY_MAX_PROMPT_LENGTH = 2_000;
export const SOLANA_WALLET_CONNECT_SUMMARY_MAX_LENGTH = 200;
