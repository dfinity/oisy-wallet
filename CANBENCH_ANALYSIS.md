## 1️⃣ Stable memory (SMI)

All rows show:

```
SMI = 0
```

That’s a very good sign.

If this were an Internet Computer canister benchmark (which it looks like), stable memory growth is the usual suspect for leaks or unintended persistence. Zero stable memory increase across the board strongly suggests:

- No accidental stable writes
- No runaway append to stable structures
- No leak into stable structures during iteration

So from a stable memory perspective: ✅ clean.

---

## 2️⃣ Heap increase (HI)

Almost everything has:

```
HI = 0
```

Except:

- `bench_btc_add_pending_transaction_200` → HI = 1
- `bench_set_many_custom_tokens_200` → HI = 2

A small heap increase in large “\*\_200” batch operations is not automatically a leak. It can simply mean:

- Capacity growth in a `Vec`, `HashMap`, `BTreeMap`, etc.
- Lazy allocation of internal buffers
- One-time allocator expansion

If this is Rust, for example, inserting 200 elements into a map may trigger:

- Reallocation
- Capacity doubling
- Bucket expansion

The key question is:

> Does HI keep increasing if you rerun the same benchmark multiple times in the same canister instance?

If:

- HI stabilises after the first run → likely just capacity growth (normal).
- HI keeps increasing on each identical run → suspicious (possible logical leak).

Right now, with HI = 1 or 2 only on large batch operations, this looks normal.

---

## 3️⃣ Instruction counts

A few numbers stand out:

- `bench_set_many_custom_tokens_200` → **1.36B instructions**
- `bench_get_account_creation_timestamps_200` → 170M
- `bench_set_many_custom_tokens_200` is by far the heaviest.

That’s not a memory issue, but it might indicate:

- O(n²) behaviour
- Re-serialisation of large structures on each insert
- Rehashing or cloning per iteration
- Full-map rewrites instead of incremental updates

If this runs inside an update call on IC, 1.36B instructions is getting into “close to limits” territory depending on execution context.

That’s more of a performance smell than a memory leak.

---

## 4️⃣ Pattern analysis

Notice how scaling behaves:

- `*_5`
- `*_50`
- `*_200`

For `get_account_creation_timestamps`:

- 5 → 4.20M
- 50 → 42.20M
- 200 → 170.28M

That’s roughly linear (×10 → ×10, ×4 → ×4). Good.

For `set_many_custom_tokens`:

- 5 → 4.83M
- 200 → 1.36B

5 → 200 is ×40 in input size.
4.83M × 40 ≈ 193M expected if linear.

Instead you get 1.36B → about 7× higher than linear.

That’s not a leak — but it strongly suggests superlinear behaviour.

---

## 5️⃣ Is this “ok”?

From a leak perspective:

- ✅ No stable memory growth
- ✅ Heap growth minimal and limited to batch operations
- ❗ No evidence of unbounded memory increase
- ❗ No growing HI across all calls

So: nothing clearly leaking.

From a performance perspective:

- ⚠️ `bench_set_many_custom_tokens_200` looks algorithmically expensive.
- Might be worth profiling that path.

---

## What I would test next

To be sure there’s no leak:

1. Run the same heavy benchmark (e.g. `set_many_custom_tokens_200`) multiple times sequentially.
2. Observe:
   - Does HI increase each time?
   - Or does it plateau?

If it plateaus → allocator growth only.
If it climbs each run → investigate retained structures.
