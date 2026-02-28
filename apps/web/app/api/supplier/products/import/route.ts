import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const VALID_CATEGORIES = [
  "PRODUCE", "MEAT", "SEAFOOD", "DAIRY", "BAKERY",
  "BEVERAGES", "DRY_GOODS", "FROZEN", "CLEANING", "EQUIPMENT", "OTHER",
];

const VALID_UNITS = [
  "POUND", "OUNCE", "KILOGRAM", "GRAM", "GALLON", "LITER",
  "QUART", "PINT", "EACH", "CASE", "DOZEN", "BOX", "BAG", "BUNCH",
];

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
    const nameIdx = headers.indexOf("name");
    const categoryIdx = headers.indexOf("category");
    const unitIdx = headers.indexOf("unit");
    const priceIdx = headers.indexOf("price");
    const descIdx = headers.indexOf("description");
    const idIdx = headers.indexOf("id");
    const inStockIdx = headers.indexOf("instock");

    if (nameIdx === -1 || priceIdx === -1) {
      return NextResponse.json(
        { error: "CSV must include 'name' and 'price' columns" },
        { status: 400 }
      );
    }

    const errors: { row: number; message: string }[] = [];
    let created = 0;
    let updated = 0;
    const supplierId = user.supplier.id;

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const rowNum = i + 1;

      const name = fields[nameIdx]?.trim();
      const priceStr = fields[priceIdx]?.trim();
      const category = categoryIdx >= 0 ? fields[categoryIdx]?.trim().toUpperCase() : "OTHER";
      const unit = unitIdx >= 0 ? fields[unitIdx]?.trim().toUpperCase() : "EACH";
      const description = descIdx >= 0 ? fields[descIdx]?.trim() : "";
      const id = idIdx >= 0 ? fields[idIdx]?.trim() : "";
      const inStockStr = inStockIdx >= 0 ? fields[inStockIdx]?.trim().toLowerCase() : "true";

      if (!name) {
        errors.push({ row: rowNum, message: "Name is required" });
        continue;
      }

      const price = parseFloat(priceStr);
      if (isNaN(price) || price <= 0) {
        errors.push({ row: rowNum, message: "Price must be a positive number" });
        continue;
      }

      if (category && !VALID_CATEGORIES.includes(category)) {
        errors.push({ row: rowNum, message: `Invalid category: ${category}` });
        continue;
      }

      if (unit && !VALID_UNITS.includes(unit)) {
        errors.push({ row: rowNum, message: `Invalid unit: ${unit}` });
        continue;
      }

      const inStock = inStockStr !== "false";

      try {
        if (id) {
          // Update existing - verify ownership
          const existing = await prisma.supplierProduct.findFirst({
            where: { id, supplierId },
          });

          if (!existing) {
            errors.push({ row: rowNum, message: `Product with id ${id} not found` });
            continue;
          }

          await prisma.supplierProduct.update({
            where: { id },
            data: {
              name,
              price,
              category: (category || "OTHER") as any,
              unit: (unit || "EACH") as any,
              description: description || null,
              inStock,
            },
          });
          updated++;
        } else {
          // Create new
          await prisma.supplierProduct.create({
            data: {
              name,
              price,
              category: (category || "OTHER") as any,
              unit: (unit || "EACH") as any,
              description: description || null,
              inStock,
              supplierId,
            },
          });
          created++;
        }
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message || "Database error" });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
    });
  } catch (error: any) {
    console.error("Product import error:", error);
    return NextResponse.json(
      { error: "Failed to import products" },
      { status: 500 }
    );
  }
}
