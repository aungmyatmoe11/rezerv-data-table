import type { Align, AnyLeafColumnDef, Breakpoint, ColumnDef, ColumnLayout, Comparator, FixedSide, GroupColumn, HeaderCellModel, Key, LeafColumn, SortDirection } from "./types";
import { compareByPath, pathKey, safeCompare, toPath } from "./value";
import { warnOnce } from "./warnings";

export interface ColumnOptions {
  /** Active breakpoints (null = no responsive filtering, e.g. SSR). */
  breakpoints: ReadonlySet<Breakpoint> | null;
  /** Leaf key order from `columnReorder`; unlisted keys keep source order after listed ones. */
  order: readonly Key[] | null;
  tableSortDirections: readonly SortDirection[];
}

export function isGroupColumn<T>(column: ColumnDef<T>): column is GroupColumn<T> {
  return Array.isArray((column as GroupColumn<T>).children);
}

export function columnKeyOf<T>(column: ColumnDef<T>, path: string): Key {
  if (column.key !== undefined) return column.key;
  const dataIndex = (column as { dataIndex?: string | readonly (string | number)[] }).dataIndex;
  if (dataIndex !== undefined) {
    const normalised = toPath(dataIndex);
    if (normalised !== null) return pathKey(normalised);
  }
  return `__col_${path}`;
}

function isVisible<T>(column: ColumnDef<T>, breakpoints: ReadonlySet<Breakpoint> | null): boolean {
  if (column.hidden === true) return false;
  const responsive = column.responsive;
  if (responsive === undefined || responsive.length === 0 || breakpoints === null) return true;
  return responsive.some((bp) => breakpoints.has(bp));
}

function normaliseFixed(fixed: FixedSide | boolean | undefined, inherited: FixedSide | null): FixedSide | null {
  if (fixed === true) return "left";
  if (fixed === "left" || fixed === "right") return fixed;
  return inherited;
}

interface Node<T> {
  column: ColumnDef<T>;
  key: Key;
  fixed: FixedSide | null;
  children: Node<T>[] | null;
  leaf: LeafColumn<T> | null;
}

function buildLeaf<T>(column: AnyLeafColumnDef<T>, key: Key, fixed: FixedSide | null): LeafColumn<T> {
  const path = toPath(column.dataIndex);
  const sorter = column.sorter;
  let comparator: Comparator<T> | null = null;
  let sortable = false;
  let serverSort = false;
  let multiple: number | false = false;
  if (sorter === true) {
    sortable = true;
    serverSort = true;
  } else if (typeof sorter === "function") {
    sortable = true;
    comparator = safeCompare(sorter);
  } else if (sorter !== undefined && sorter !== false) {
    sortable = true;
    multiple = typeof sorter.multiple === "number" ? sorter.multiple : false;
    if (typeof sorter.compare === "function") comparator = safeCompare(sorter.compare);
    else serverSort = true;
  }
  if (sortable && comparator === null && !serverSort) comparator = compareByPath<T>(path);

  const width = typeof column.width === "number" ? column.width : undefined;
  if (fixed !== null && width === undefined) {
    warnOnce(`fixed:width:${String(key)}`, `Fixed column "${String(key)}" has no numeric \`width\`; sticky offsets assume 0.`);
  }
  const ellipsis = column.ellipsis;
  const render = column.render as LeafColumn<T>["render"] | undefined;

  return {
    key,
    def: column as ColumnDef<T>,
    path,
    title: column.title,
    fixed,
    width,
    widthRaw: column.width,
    minWidth: column.minWidth,
    align: column.align ?? "left",
    ellipsis: ellipsis !== undefined && ellipsis !== false,
    ellipsisTitle: typeof ellipsis === "object" ? ellipsis.showTitle !== false : ellipsis === true,
    className: column.className,
    sortable,
    comparator,
    serverSort,
    multiple,
    sortDirections: column.sortDirections ?? undefined,
    filterable: Array.isArray(column.filters) && column.filters.length > 0 && typeof column.onFilter === "function",
    onFilter: typeof column.onFilter === "function" ? column.onFilter : null,
    onCell: typeof column.onCell === "function" ? column.onCell : null,
    render: render ?? null,
    draggable: column.draggable !== false && fixed === null,
    index: -1,
  };
}

function buildTree<T>(columns: readonly ColumnDef<T>[], parentPath: string, inheritedFixed: FixedSide | null, options: ColumnOptions): Node<T>[] {
  const nodes: Node<T>[] = [];
  columns.forEach((column, index) => {
    const path = parentPath === "" ? String(index) : `${parentPath}.${index}`;
    if (!isVisible(column, options.breakpoints)) return;
    const key = columnKeyOf(column, path);
    const fixed = normaliseFixed(column.fixed, inheritedFixed);
    if (isGroupColumn(column)) {
      const children = buildTree(column.children, path, fixed, options);
      if (children.length === 0) return;
      nodes.push({ column, key, fixed, children, leaf: null });
      return;
    }
    nodes.push({ column, key, fixed, children: null, leaf: buildLeaf(column as AnyLeafColumnDef<T>, key, fixed) });
  });
  return applyOrder(nodes, options.order);
}

function applyOrder<T>(nodes: Node<T>[], order: readonly Key[] | null): Node<T>[] {
  if (order === null || order.length === 0) return nodes;
  const rank = new Map<Key, number>();
  order.forEach((key, index) => rank.set(key, index));
  const listed = nodes.filter((node) => rank.has(node.key)).sort((a, b) => (rank.get(a.key) ?? 0) - (rank.get(b.key) ?? 0));
  const unlisted = nodes.filter((node) => !rank.has(node.key));
  // fixed boundary ကို မကျော်စေဖို့: left → middle → right partition ကို resolveColumns မှာ ထပ်လုပ်တယ်
  return [...listed, ...unlisted];
}

function collectLeaves<T>(nodes: readonly Node<T>[], out: LeafColumn<T>[]): void {
  for (const node of nodes) {
    if (node.leaf !== null) out.push(node.leaf);
    else if (node.children !== null) collectLeaves(node.children, out);
  }
}

function depthOf<T>(nodes: readonly Node<T>[]): number {
  let depth = 1;
  for (const node of nodes) {
    if (node.children !== null) depth = Math.max(depth, 1 + depthOf(node.children));
  }
  return depth;
}

function leafCount<T>(node: Node<T>): number {
  if (node.leaf !== null) return 1;
  return (node.children ?? []).reduce((sum, child) => sum + leafCount(child), 0);
}

function buildHeaderRows<T>(nodes: readonly Node<T>[], maxDepth: number): HeaderCellModel<T>[][] {
  const rows: HeaderCellModel<T>[][] = Array.from({ length: maxDepth }, () => []);
  const visit = (list: readonly Node<T>[], level: number): void => {
    for (const node of list) {
      const headerSpan = (node.column as { colSpan?: number }).colSpan;
      if (node.leaf !== null) {
        if (headerSpan === 0) continue;
        rows[level]?.push({
          key: node.key,
          column: node.column,
          leaf: node.leaf,
          colSpan: headerSpan ?? 1,
          rowSpan: maxDepth - level,
          fixed: node.fixed,
          align: node.leaf.align,
          className: node.leaf.className,
        });
        continue;
      }
      rows[level]?.push({
        key: node.key,
        column: node.column,
        leaf: null,
        colSpan: leafCount(node),
        rowSpan: 1,
        fixed: node.fixed,
        align: (node.column as { align?: Align }).align ?? "center",
        className: (node.column as { className?: string }).className,
      });
      visit(node.children ?? [], level + 1);
    }
  };
  visit(nodes, 0);
  return rows;
}

/**
 * Resolves the column tree into visible leaves (in render order), header rows, and
 * sticky offsets. Leaves are stably partitioned as [left…, middle…, right…].
 */
export function resolveColumns<T>(columns: readonly ColumnDef<T>[], options: ColumnOptions): ColumnLayout<T> {
  const tree = buildTree(columns, "", null, options);
  const leavesInSource: LeafColumn<T>[] = [];
  collectLeaves(tree, leavesInSource);

  const left = leavesInSource.filter((leaf) => leaf.fixed === "left");
  const middle = leavesInSource.filter((leaf) => leaf.fixed === null);
  const right = leavesInSource.filter((leaf) => leaf.fixed === "right");
  const partitioned = [...left, ...middle, ...right];
  if (partitioned.some((leaf, index) => leaf !== leavesInSource[index])) {
    warnOnce("fixed:order", "Fixed columns were reordered to [left…, middle…, right…]; declare them at the edges to avoid surprises.");
  }
  const leaves = partitioned.map((leaf, index) => ({ ...leaf, index }));

  const leftOffsets = new Map<Key, number>();
  let offset = 0;
  for (const leaf of left) {
    leftOffsets.set(leaf.key, offset);
    offset += leaf.width ?? 0;
  }
  const rightOffsets = new Map<Key, number>();
  offset = 0;
  for (const leaf of [...right].reverse()) {
    rightOffsets.set(leaf.key, offset);
    offset += leaf.width ?? 0;
  }

  const allWidthsNumeric = leaves.every((leaf) => leaf.width !== undefined);
  const totalWidth = allWidthsNumeric ? leaves.reduce((sum, leaf) => sum + (leaf.width ?? 0), 0) : 0;

  // header rows follow the partitioned order for flat trees; grouped trees keep their tree order
  const hasGroups = tree.some((node) => node.children !== null);
  const orderedTree = hasGroups ? tree : leaves.map((leaf) => tree.find((node) => node.key === leaf.key) ?? { column: leaf.def, key: leaf.key, fixed: leaf.fixed, children: null, leaf });
  const headerRows = buildHeaderRows(orderedTree, depthOf(orderedTree));

  return {
    leaves,
    headerRows,
    leftOffsets,
    rightOffsets,
    lastLeftKey: left.length > 0 ? (left[left.length - 1]?.key ?? null) : null,
    firstRightKey: right.length > 0 ? (right[0]?.key ?? null) : null,
    hasFixed: left.length > 0 || right.length > 0,
    totalWidth,
    allWidthsNumeric,
  };
}

export function leavesByKey<T>(leaves: readonly LeafColumn<T>[]): ReadonlyMap<Key, LeafColumn<T>> {
  return new Map(leaves.map((leaf) => [leaf.key, leaf]));
}
