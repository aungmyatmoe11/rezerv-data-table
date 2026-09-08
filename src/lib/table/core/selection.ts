/**
 * Selection sets: page-scope and all-scope operations, invert, prune, and the
 * parent / child cascade used when `rowSelection.checkStrictly` is `false`.
 */
import type { GetRowKey, Key } from "./types";

export interface KeyEntity<T> {
  key: Key;
  record: T;
  parentKey: Key | null;
  childKeys: readonly Key[];
  disabled: boolean;
}

/** Entities over the FULL (filtered + sorted) tree, so parent / child linkage crosses pages. */
export function buildKeyEntities<T>(
  rows: readonly T[],
  getKey: GetRowKey<T>,
  childrenColumnName: string | null,
  isDisabled: ((record: T) => boolean) | null,
): ReadonlyMap<Key, KeyEntity<T>> {
  const entities = new Map<Key, KeyEntity<T>>();
  const visit = (list: readonly T[], parentKey: Key | null): Key[] => {
    const keys: Key[] = [];
    list.forEach((record, index) => {
      const key = getKey(record, index);
      keys.push(key);
      const children = childrenColumnName === null ? null : (record as Record<string, unknown>)[childrenColumnName];
      const childKeys = Array.isArray(children) ? visit(children as readonly T[], key) : [];
      entities.set(key, { key, record, parentKey, childKeys, disabled: isDisabled?.(record) ?? false });
    });
    return keys;
  };
  visit(rows, null);
  return entities;
}

function descendants<T>(key: Key, entities: ReadonlyMap<Key, KeyEntity<T>>, out: Key[] = []): Key[] {
  const entity = entities.get(key);
  if (entity === undefined) return out;
  for (const child of entity.childKeys) {
    out.push(child);
    descendants(child, entities, out);
  }
  return out;
}

/**
 * `checkStrictly: false` linkage. Checking a node checks its enabled descendants; a
 * parent becomes checked when all its enabled children are checked. Unchecking a node
 * unchecks its descendants and every ancestor.
 */
export function conductCheck<T>(selected: readonly Key[], key: Key, checked: boolean, entities: ReadonlyMap<Key, KeyEntity<T>>): readonly Key[] {
  const set = new Set(selected);
  const enabledDescendants = descendants(key, entities).filter((k) => !(entities.get(k)?.disabled ?? false));
  if (checked) {
    set.add(key);
    for (const k of enabledDescendants) set.add(k);
    // ancestor တွေကို ပြန်စစ်: enabled children အားလုံး checked ဖြစ်မှ parent ကို check
    let parent = entities.get(key)?.parentKey ?? null;
    while (parent !== null) {
      const entity = entities.get(parent);
      if (entity === undefined) break;
      const enabledChildren = entity.childKeys.filter((k) => !(entities.get(k)?.disabled ?? false));
      if (enabledChildren.length > 0 && enabledChildren.every((k) => set.has(k))) set.add(parent);
      parent = entity.parentKey;
    }
  } else {
    set.delete(key);
    for (const k of enabledDescendants) set.delete(k);
    let parent = entities.get(key)?.parentKey ?? null;
    while (parent !== null) {
      set.delete(parent);
      parent = entities.get(parent)?.parentKey ?? null;
    }
  }
  return [...set];
}

/** Keys the user may toggle on the current page. */
export function changeableKeys(pageKeys: readonly Key[], disabled: ReadonlySet<Key>): readonly Key[] {
  return pageKeys.filter((key) => !disabled.has(key));
}

export function selectKeys(selected: readonly Key[], keys: readonly Key[], checked: boolean): readonly Key[] {
  if (checked) {
    const set = new Set(selected);
    for (const key of keys) set.add(key);
    return [...set];
  }
  const remove = new Set(keys);
  return selected.filter((key) => !remove.has(key));
}

export function invertKeys(selected: readonly Key[], keys: readonly Key[]): readonly Key[] {
  const set = new Set(selected);
  for (const key of keys) {
    if (set.has(key)) set.delete(key);
    else set.add(key);
  }
  return [...set];
}

/** Drop keys whose record is gone unless `preserveSelectedRowKeys`. Returns the same array when nothing changed. */
export function pruneKeys(selected: readonly Key[], exists: (key: Key) => boolean, preserve: boolean): readonly Key[] {
  if (preserve) return selected;
  const next = selected.filter(exists);
  return next.length === selected.length ? selected : next;
}
