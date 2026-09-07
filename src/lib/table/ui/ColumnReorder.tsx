"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HolderOutlined } from "@ant-design/icons";
import type { CSSProperties, ReactNode } from "react";
import type { Key } from "../core/types";
import type { ReorderApi } from "../react/use-table";
import { HeaderCell, type HeaderCellProps } from "./HeaderCell";

/**
 * Column drag-to-reorder on top of dnd-kit (a non-table primitive). Only unfixed leaf columns
 * participate; fixed columns stay pinned at the edges and grouped headers are never dragged.
 */
export function ColumnReorderProvider({ reorder, children }: { reorder: ReorderApi; children: ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const items = reorder.draggableKeys.map(String);

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const from = items.indexOf(String(active.id));
    const to = items.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const draggable = arrayMove([...reorder.draggableKeys], from, to);
    // fixed columns keep their slots; only the draggable subsequence is permuted
    let cursor = 0;
    const next: Key[] = reorder.order.map((key) => (reorder.draggableKeys.includes(key) ? (draggable[cursor++] ?? key) : key));
    reorder.setOrder(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

type SortableHeaderCellProps<T> = Omit<HeaderCellProps<T>, "dragHandle" | "dragRef" | "dragStyle" | "dragging">;

/** A header cell bound to the sortable context; rendered only for draggable leaves. */
export function SortableHeaderCell<T>(props: SortableHeaderCellProps<T>) {
  const label = typeof props.cell.column.title === "string" ? props.cell.column.title : String(props.cell.key);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: String(props.cell.key) });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    ...(transition === null || transition === undefined ? {} : { transition }),
    ...(isDragging ? { zIndex: 5 } : {}),
  };
  const handle = (
    <button type="button" ref={setActivatorNodeRef} className="dt__drag-handle" aria-label={`Reorder column ${label}`} {...listeners} {...attributes}>
      <HolderOutlined />
    </button>
  );
  return <HeaderCell {...props} dragHandle={handle} dragRef={setNodeRef} dragStyle={style} dragging={isDragging} />;
}
