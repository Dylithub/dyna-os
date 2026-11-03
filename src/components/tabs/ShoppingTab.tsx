"use client";

// Weekly shopping list. The items carry over week to week; the ticks clear
// automatically each Monday (ensureShoppingList in lib/shopping.ts).
// EDIT switches the list into inputs for renaming, adding, and removing.

import { useState } from "react";
import type { LifeOS, ShoppingList, ShoppingSection } from "@/lib/types";
import { ensureShoppingList, newShoppingId } from "@/lib/shopping";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";

interface ShoppingTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function ShoppingTab({ data, update }: ShoppingTabProps) {
  const [editing, setEditing] = useState(false);
  const sections = data.shoppingList?.sections || [];

  const allItems = sections.flatMap((s) => s.items);
  const tickedCount = allItems.filter((i) => i.checked).length;

  // All edits go through here: ensure the list (and this week's ticks) first
  function editList(change: (list: ShoppingList) => void) {
    update((current) => {
      const updated = ensureShoppingList(current);
      change(updated.shoppingList!);
      return { ...updated };
    });
  }

  function editSection(sectionId: string, change: (section: ShoppingSection) => void) {
    editList((list) => {
      const section = list.sections.find((s) => s.id === sectionId);
      if (section) change(section);
    });
  }

  function toggleItem(sectionId: string, itemId: string) {
    editSection(sectionId, (section) => {
      const item = section.items.find((i) => i.id === itemId);
      if (item) item.checked = !item.checked;
    });
  }

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        SHOPPING LIST
      </div>

      <TerminalCard>
        <div className="flex justify-between items-center gap-2">
          <div>
            <div className="text-terminal text-xs">
              {tickedCount} / {allItems.length} in the basket
            </div>
            <div className="text-terminal-dim text-[10px] mt-0.5">Ticks clear every Monday</div>
          </div>
          <TerminalButton small active={editing} onClick={() => setEditing(!editing)}>
            {editing ? "DONE" : "EDIT"}
          </TerminalButton>
        </div>
      </TerminalCard>

      {sections.map((section) => (
        <TerminalCard key={section.id} title={editing ? undefined : section.name.toUpperCase()}>
          {editing && (
            <div className="flex gap-2 items-center mb-3">
              <input
                type="text"
                value={section.name}
                placeholder="Section name"
                onChange={(e) =>
                  editSection(section.id, (s) => {
                    s.name = e.target.value;
                  })
                }
                className="!p-2 !text-xs w-full"
              />
              <button
                onClick={() =>
                  editList((list) => {
                    list.sections = list.sections.filter((s) => s.id !== section.id);
                  })
                }
                className="text-terminal-warning text-[10px] tracking-wider min-h-[32px] px-2 cursor-pointer whitespace-nowrap"
                aria-label={`Remove section ${section.name}`}
              >
                ✕ SECTION
              </button>
            </div>
          )}

          <div className="flex flex-col">
            {section.items.map((item) =>
              editing ? (
                <div key={item.id} className="flex gap-2 items-center py-1">
                  <input
                    type="text"
                    value={item.text}
                    placeholder="Item"
                    onChange={(e) =>
                      editSection(section.id, (s) => {
                        const target = s.items.find((i) => i.id === item.id);
                        if (target) target.text = e.target.value;
                      })
                    }
                    className="!p-2 !text-xs w-full"
                  />
                  <button
                    onClick={() =>
                      editSection(section.id, (s) => {
                        s.items = s.items.filter((i) => i.id !== item.id);
                      })
                    }
                    className="text-terminal-warning text-xs min-h-[32px] px-2 cursor-pointer"
                    aria-label={`Remove ${item.text || "item"}`}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  key={item.id}
                  onClick={() => toggleItem(section.id, item.id)}
                  className="flex items-center gap-2.5 py-2 border-b border-terminal/10 last:border-b-0 cursor-pointer select-none"
                >
                  <span
                    className={
                      item.checked
                        ? "w-5 h-5 shrink-0 flex items-center justify-center border text-[10px] bg-terminal/20 border-terminal text-terminal"
                        : "w-5 h-5 shrink-0 border border-terminal-dim"
                    }
                  >
                    {item.checked ? "✓" : ""}
                  </span>
                  <span
                    className={`text-xs ${item.checked ? "text-terminal-dim line-through" : "text-terminal"}`}
                  >
                    {item.text}
                  </span>
                </div>
              )
            )}
          </div>

          {editing && (
            <div className="mt-2">
              <TerminalButton
                small
                onClick={() =>
                  editSection(section.id, (s) => {
                    s.items.push({ id: newShoppingId(), text: "", checked: false });
                  })
                }
              >
                + ADD ITEM
              </TerminalButton>
            </div>
          )}
        </TerminalCard>
      ))}

      {editing && (
        <TerminalButton
          onClick={() =>
            editList((list) => {
              list.sections.push({ id: newShoppingId(), name: "New section", items: [] });
            })
          }
        >
          + ADD SECTION
        </TerminalButton>
      )}
    </>
  );
}
