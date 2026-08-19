// The generated one-line summary of a Solana transaction, whether it is one the user is being
// asked to sign or one they already made and opened from their history.
//
// The model is only ever asked to phrase facts the screen has already derived and is already
// showing, so the prompt is a short list of those facts and nothing else. `/no_think` turns off
// the model's reasoning preamble: it is latency and tokens spent on output we discard anyway.
export const SOLANA_SUMMARY_SYSTEM_PROMPT = `/no_think
You rewrite a list of facts about a Solana transaction as one short sentence, for a wallet screen that is already showing those same facts.

RULES:
- Use ONLY the facts given to you. Never infer, guess, calculate, or add anything, including what the transaction is for or whether it is safe. Name an app or protocol only when the facts name it.
- Copy every number, amount, token symbol and address exactly as given. Never invent one, never round one, never convert one.
- Answer with exactly one sentence of at most 70 characters, ending with a period. It is the title of a row in a list, so it must be short.
- Name what moved and how much. Do not name who it went to or came from: the screen already shows that.
- Plain text only: no markdown, no formatting, no quotes, no links, no code, no line breaks.
- Begin with exactly one of these three words, because they are what the rest of the wallet calls things: "Sent" when this wallet paid, "Received" when it was paid, "Swapped" when one token left and another arrived. Never begin with anything else, and never begin with the name of an app, a protocol or a program.
- A swap is "Swapped X for Y". Say that even when the facts name the app it happened on.
- When the facts name what it went through, it goes at the end and only if the sentence still fits: "Swapped 0.005 SOL for 0.377098 USDC on Jupiter." It never replaces the action and it is never the subject.
- When the facts list steps, name what the transaction IS from them, and ignore the steps that only prepare or clean up. Creating or closing a token account alongside a transfer is still a transfer, and the rent it costs is not a second payment. Sending one token and receiving another is a swap.
- If the only facts about what moves are simulated balance changes, state those changes as what the transaction does and do not name a transfer type.
- Do not give advice, do not warn, do not address the reader.
- If the facts do not describe an action, answer with exactly: UNKNOWN`;

// The sentence is decoration on top of a screen that is already complete, so it is given a budget
// rather than being waited on. The canister call is an update call (consensus, then queueing, then
// generation), and measured on staging it routinely runs past twenty seconds: at that budget the
// answer arrived and was thrown away, which reads exactly like a model that produced nothing.
// Nothing waits on this, so a generous bound costs only a sentence that appears late.
export const SOLANA_SUMMARY_TIMEOUT_MILLISECONDS = 60_000;

// Bounds on what crosses the boundary in each direction. The prompt cap is far below the
// canister's own ~10 KiB limit: the facts are a handful of short lines, and a transaction that
// touches enough accounts to exceed this has more balance changes than one sentence can honestly
// describe. The response cap is the length rule above plus slack, past which the answer is
// dropped rather than truncated mid-figure.
export const SOLANA_SUMMARY_MAX_PROMPT_LENGTH = 2_000;
export const SOLANA_SUMMARY_MAX_LENGTH = 200;
