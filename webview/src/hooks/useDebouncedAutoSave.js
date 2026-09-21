import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SAVE_CHAIN = 12;

/**
 * Debounced auto-save hook.
 *
 * Watches `draft`, compares against `persisted` via `normalize`,
 * and calls `save(draft)` after `delayMs` of inactivity when there is
 * a meaningful diff.
 *
 * Saves for a single hook instance are **serialized** on a promise chain so
 * concurrent flush/timer/key-change saves cannot reorder responses against
 * the latest draft.
 *
 * Flush is driven only by key change (leave current YAML entity), not by
 * React mount/unmount. When `key` changes (e.g. run_id or file_path), we
 * flush the previous key's draft from its snapshot (dirty check).
 *
 * @returns {{ saving: boolean, flush: () => Promise<void> }}
 */
export function useDebouncedAutoSave({
  enabled = false,
  key = undefined,
  draft,
  persisted,
  normalize = (x) => x,
  save,
  delayMs = 800,
  silent = false,
}) {
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);
  const prevKeyRef = useRef(key);

  const keySnapshotsRef = useRef(new Map());
  if (enabled) {
    keySnapshotsRef.current.set(key, { draft, persisted, save, normalize });
  }

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;
  const saveRef = useRef(save);
  saveRef.current = save;
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;
  const silentRef = useRef(silent);
  silentRef.current = silent;

  const saveTailRef = useRef(Promise.resolve());

  const draftSerialized = JSON.stringify(draft);

  const runSaveChain = useCallback(() => {
    const run = saveTailRef.current.then(async () => {
      let iterations = 0;
      while (iterations < MAX_SAVE_CHAIN) {
        iterations += 1;
        const norm = normalizeRef.current;
        const draftToSave = draftRef.current;
        const a = JSON.stringify(norm(draftToSave));
        const b = JSON.stringify(norm(persistedRef.current));
        if (a === b) return;
        if (!silentRef.current) setSaving(true);
        try {
          await saveRef.current(draftToSave);
        } catch (e) {
          console.warn("useDebouncedAutoSave: save failed", e);
          throw e;
        } finally {
          if (!silentRef.current) setSaving(false);
        }
        // Stop if draft did not change during the save. Parent will refresh
        // `persisted` asynchronously; re-save only when the user edited mid-flight.
        const after = JSON.stringify(norm(draftRef.current));
        if (after === a) return;
      }
      console.warn("useDebouncedAutoSave: max save chain iterations reached");
    });
    // Keep the queue healthy after a rejection so later saves can enqueue.
    saveTailRef.current = run.catch(() => {});
    return run;
  }, []);

  /** Immediately persist the current draft if it differs from persisted. */
  const flush = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const norm = normalizeRef.current;
    const a = JSON.stringify(norm(draftRef.current));
    const b = JSON.stringify(norm(persistedRef.current));
    if (a !== b) {
      return runSaveChain();
    }
    return Promise.resolve();
  }, [runSaveChain]);

  // --- Main debounce effect: `enabled` in deps clears timer when autosave is disabled (same key). ---
  useEffect(() => {
    // Key change: flush previous key from snapshot (dirty check).
    if (key !== prevKeyRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const oldKey = prevKeyRef.current;
      const oldSnapshot = keySnapshotsRef.current.get(oldKey);
      prevKeyRef.current = key;
      if (oldSnapshot) {
        const a = JSON.stringify(oldSnapshot.normalize(oldSnapshot.draft));
        const b = JSON.stringify(oldSnapshot.normalize(oldSnapshot.persisted));
        if (a !== b) {
          saveTailRef.current = saveTailRef.current.then(() =>
            oldSnapshot.save(oldSnapshot.draft).catch((e) =>
              console.warn("useDebouncedAutoSave: flush on key change failed", e),
            ),
          );
        }
        keySnapshotsRef.current.delete(oldKey);
      }
    }

    if (!enabled) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      runSaveChain().catch((e) =>
        console.warn("useDebouncedAutoSave: debounced save failed", e),
      );
    }, delayMs);

    return () => {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [key, draftSerialized, delayMs, enabled, runSaveChain]);

  return { saving, flush };
}
