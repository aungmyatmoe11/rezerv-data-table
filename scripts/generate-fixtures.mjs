#!/usr/bin/env node
// Deterministic fixture generator (seeded PRNG) → src/mocks/fixtures/*.json
// Run: node scripts/generate-fixtures.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "mocks", "fixtures");
mkdirSync(out, { recursive: true });

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260907);
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pad = (n, w = 3) => String(n).padStart(w, "0");

// ---------------------------------------------------------------- classes
const classNames = ["Yoga Flow", "HIIT Blast", "Pilates Core", "Spin 45", "Boxing Basics", "Barre Sculpt", "Zumba Party", "Power Lifting", "Mobility & Stretch", "Aqua Fit", "Kettlebell Circuit", "Mindful Meditation", "Reformer Pilates", "Bootcamp", "Dance Cardio", "Strength 101"];
const instructors = ["Marcus Lee", "Priya Nair", "Jonas Berg", "Aung Kyaw", "Sofia Rossi", "Daniel Park", "Mei Lin", "Thandiwe M.", "Lucas Silva", "Hana Sato"];
const locations = ["Studio A", "Studio B", "Studio C", "Pool", "Outdoor Deck"];
const firstNames = ["Ava", "Liam", "Noah", "Emma", "Mia", "Ethan", "Zoe", "Kai", "Aria", "Leo", "Nina", "Omar", "Ivy", "Theo", "Lena", "Max", "Ruby", "Eli", "Sara", "Ben", "Chloe", "Yuki", "Nadia", "Ravi"];
const lastNames = ["Tan", "Nguyen", "Garcia", "Okafor", "Schmidt", "Ito", "Khan", "Dubois", "Moreno", "Chen", "Patel", "Novak", "Haddad", "Silva", "Kim", "Andersson"];
const paymentTypes = ["One-time", "Package", "Membership"];

const classes = [];
const attendees = [];
const weekStart = new Date("2026-09-07T00:00:00+08:00");
for (let i = 0; i < 64; i += 1) {
  const day = i % 7;
  const hour = 6 + Math.floor(i / 7) * 2 + (i % 2);
  const durationMin = pick([45, 50, 60, 75]);
  const start = new Date(weekStart.getTime() + day * 86400000 + hour * 3600000);
  const end = new Date(start.getTime() + durationMin * 60000);
  const capacity = between(8, 24);
  const cancelled = rand() < 0.08;
  const booked = cancelled ? between(0, 4) : between(0, capacity);
  const id = `cls-${pad(i + 1)}`;
  const status = cancelled ? "Cancelled" : booked >= capacity ? "Full" : "Scheduled";
  classes.push({ id, name: pick(classNames), instructor: pick(instructors), location: pick(locations), startAt: start.toISOString(), endAt: end.toISOString(), bookedCount: booked, capacity, status });

  // bookedCount === attendees whose bookingStatus !== "Cancelled"
  for (let a = 0; a < booked; a += 1) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const bookingStatus = start < new Date("2026-09-10T00:00:00+08:00") ? pick(["Checked-in", "Checked-in", "Booked", "No-show"]) : "Booked";
    attendees.push({ id: `att-${pad(attendees.length + 1, 4)}`, classId: id, name: `${first} ${last}`, email: `${first}.${last}@example.com`.toLowerCase(), paymentType: pick(paymentTypes), bookingStatus });
  }
  const extraCancelled = between(0, 2);
  for (let c = 0; c < extraCancelled; c += 1) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    attendees.push({ id: `att-${pad(attendees.length + 1, 4)}`, classId: id, name: `${first} ${last}`, email: `${first}.${last}@example.com`.toLowerCase(), paymentType: pick(paymentTypes), bookingStatus: "Cancelled" });
  }
}

// -------------------------------------------------------------- inventory
const categories = ["Apparel", "Equipment", "Supplements", "Accessories", "Recovery"];
const productNames = { Apparel: ["Studio Tee", "Flex Leggings", "Zip Hoodie", "Performance Shorts"], Equipment: ["Yoga Mat Pro", "Kettlebell", "Resistance Band Set", "Foam Roller", "Jump Rope"], Supplements: ["Whey Isolate", "Electrolyte Mix", "Creatine", "Protein Bar Box"], Accessories: ["Water Bottle 750ml", "Gym Towel", "Lifting Straps", "Headband"], Recovery: ["Massage Ball", "Ice Pack", "Compression Sleeve"] };
const warehouses = ["Main", "WH-North", "WH-South", "WH-East"];
const items = [];
const movements = [];
let sku = 1000;
for (let i = 0; i < 64; i += 1) {
  const category = categories[i % categories.length];
  const base = pick(productNames[category]);
  const id = `item-${pad(i + 1)}`;
  const qty = (between(0, 500) + [0, 0.25, 0.5, 0.75][between(0, 3)]).toFixed(3);
  const lastCounted = rand() < 0.15 ? null : new Date(weekStart.getTime() - between(1, 120) * 86400000).toISOString().slice(0, 10);
  const variantCount = rand() < 0.35 ? between(1, 3) : 0;
  const item = { id, sku: `SKU-${sku}`, name: base, category, warehouse: pick(warehouses), quantity: qty, unitPrice: { amount: Number((between(5, 180) + [0, 0.5, 0.99][between(0, 2)]).toFixed(2)), currency: "SGD" }, active: rand() > 0.12, lastCountedOn: lastCounted };
  sku += between(1, 7);
  if (variantCount > 0) {
    item.children = [];
    const sizes = ["S", "M", "L", "XL"];
    for (let v = 0; v < variantCount; v += 1) {
      item.children.push({ id: `${id}-v${v + 1}`, sku: `${item.sku}-${sizes[v]}`, name: `${base} — ${sizes[v]}`, category, warehouse: item.warehouse, quantity: (between(0, 120)).toFixed(3), unitPrice: item.unitPrice, active: item.active, lastCountedOn: lastCounted });
    }
  }
  items.push(item);
  const moves = between(1, 5);
  for (let m = 0; m < moves; m += 1) {
    const delta = between(-40, 60);
    movements.push({ id: `mov-${pad(movements.length + 1, 4)}`, itemId: id, occurredAt: new Date(weekStart.getTime() - between(0, 60) * 86400000 - between(0, 86399) * 1000).toISOString(), delta: delta.toFixed(3), reason: delta >= 0 ? pick(["Purchase order", "Return", "Stock count adjustment", "Transfer in"]) : pick(["Sale", "Damage", "Transfer out", "Sample"]) });
  }
}

writeFileSync(join(out, "classes.json"), JSON.stringify(classes, null, 2) + "\n");
writeFileSync(join(out, "attendees.json"), JSON.stringify(attendees, null, 2) + "\n");
writeFileSync(join(out, "items.json"), JSON.stringify(items, null, 2) + "\n");
writeFileSync(join(out, "movements.json"), JSON.stringify(movements, null, 2) + "\n");
console.log(`classes ${classes.length}, attendees ${attendees.length}, items ${items.length}, movements ${movements.length}`);
