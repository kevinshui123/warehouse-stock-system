/**
 * Import Stock.csv Products
 *
 * Imports 457 products from C:\Users\Administrator\Desktop\Stock.csv into the database.
 * CSV columns: No, Description, Item#, Sale Qty, Received Qty, Remaining Stock
 *
 * Since the CSV has no category/supplier info, this script:
 *   - Creates a "General" category if none exists
 *   - Creates a "CSV Import Supplier" if none exists
 *   - Sets a default price of 0 (products can be updated later)
 *   - Sets status based on remaining stock: "Stock Out" = 0, "Stock Low" <= 10, "Available" > 10
 *
 * Usage (from project root):
 *   npx tsx scripts/import-stock-csv.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface CsvRow {
  No: string;
  Description: string;
  "Item#": string;
  "Sale Qty": string;
  "Received Qty": string;
  "Remaining Stock": string;
}

function getStatus(quantity: number): string {
  if (quantity <= 0) return "Stock Out";
  if (quantity <= 10) return "Stock Low";
  return "Available";
}

function parseQuantity(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : Math.round(num);
}

async function findOrCreateAdminUser(): Promise<string> {
  // Find any admin user
  const adminUser = await prisma.user.findFirst({
    where: {
      role: { in: ["admin", "user"] },
    },
    orderBy: { createdAt: "asc" },
  });

  if (adminUser) {
    console.log(`   Using admin user: ${adminUser.email} (ID: ${adminUser.id})`);
    return adminUser.id;
  }

  throw new Error("No admin user found. Please register an account first.");
}

async function findOrCreateCategory(userId: string): Promise<string> {
  // Check for existing "General" category
  const existing = await prisma.category.findFirst({
    where: {
      userId,
      name: { equals: "General", mode: "insensitive" },
    },
  });

  if (existing) {
    console.log(`   Using existing category: "General" (ID: ${existing.id})`);
    return existing.id;
  }

  const category = await prisma.category.create({
    data: {
      name: "General",
      userId,
      createdBy: userId,
      updatedBy: userId,
      status: true,
      description: "Default category for imported products",
    },
  });

  console.log(`   Created category: "General" (ID: ${category.id})`);
  return category.id;
}

async function findOrCreateSupplier(userId: string): Promise<string> {
  // Check for existing "CSV Import Supplier"
  const existing = await prisma.supplier.findFirst({
    where: {
      userId,
      name: { equals: "CSV Import Supplier", mode: "insensitive" },
    },
  });

  if (existing) {
    console.log(`   Using existing supplier: "CSV Import Supplier" (ID: ${existing.id})`);
    return existing.id;
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: "CSV Import Supplier",
      userId,
      createdBy: userId,
      updatedBy: userId,
      status: true,
      description: "Default supplier for products imported from CSV",
    },
  });

  console.log(`   Created supplier: "CSV Import Supplier" (ID: ${supplier.id})`);
  return supplier.id;
}

interface ParsedRow {
  no: string;
  description: string;
  sku: string;
  saleQty: number;
  receivedQty: number;
  remainingStock: number;
  rawLine: string;
}

/**
 * Parse a CSV line with possible commas inside the description field.
 * Format: No,Description,Item#,Sale Qty,Received Qty,Remaining Stock
 * Strategy: find the last 4 comma-separated values (SKU, 3 qty fields),
 * everything before that is the description.
 */
function parseStockCsvLine(line: string, lineIndex: number): ParsedRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(",");

  // Need at least 4 parts (No, desc, SKU, 1 qty) and at most 6 (all qty fields present)
  if (parts.length < 4) return null;

  // The last 4 fields are always: Item#(SKU), Sale Qty, Received Qty, Remaining Stock
  // Everything before that (at least 2 parts: No + description) is: No, Description
  const no = parts[0];
  const sku = parts[parts.length - 4];
  const saleQty = parseQuantity(parts[parts.length - 3]);
  const receivedQty = parseQuantity(parts[parts.length - 2]);
  const remainingStock = parseQuantity(parts[parts.length - 1]);

  // The description is everything between No and SKU
  const description = parts.slice(1, parts.length - 4).join(",");

  return {
    no,
    description: description.trim(),
    sku: sku.trim().toUpperCase(),
    saleQty,
    receivedQty,
    remainingStock,
    rawLine: line,
  };
}

async function main() {
  console.log("\n📦 Import Stock.csv\n");

  const csvPath = path.join("C:\\Users\\Administrator\\Desktop", "Stock.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  // Read CSV manually to handle commas inside description fields
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const lines = fileContent.split("\n");

  // Skip header row
  const dataLines = lines.filter((l) => l.trim() && !l.startsWith("No,"));
  console.log(`   Total data rows: ${dataLines.length}`);

  // Find or create user, category, and supplier
  const userId = await findOrCreateAdminUser();
  const categoryId = await findOrCreateCategory(userId);
  const supplierId = await findOrCreateSupplier(userId);

  // Process rows
  let successCount = 0;
  let skipCount = 0;
  const errors: Array<{ row: number; sku: string; message: string }> = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const rowNum = i + 2; // +2 for 1-based index and header row

    const parsed = parseStockCsvLine(line, rowNum);

    if (!parsed) {
      skipCount++;
      continue;
    }

    const { description, sku, remainingStock } = parsed;
    const quantity = remainingStock;

    // Skip rows without description or SKU
    if (!description && !sku) {
      skipCount++;
      continue;
    }

    const finalSku = sku || `AUTO-${String(i + 1).padStart(4, "0")}`;
    const finalName = description || `Product ${finalSku}`;

    try {
      // Check for duplicate SKU
      const existing = await prisma.product.findFirst({
        where: { sku: finalSku, userId },
      });

      if (existing) {
        skipCount++;
        errors.push({
          row: rowNum,
          sku: finalSku,
          message: `SKU "${finalSku}" already exists, skipped`,
        });
        continue;
      }

      // Create product
      await prisma.product.create({
        data: {
          name: finalName,
          sku: finalSku,
          price: 0, // Default price - to be updated
          quantity: BigInt(quantity),
          status: getStatus(quantity),
          categoryId,
          supplierId,
          userId,
          createdBy: userId,
          reservedQuantity: BigInt(0),
        },
      });

      successCount++;

      // Progress indicator every 50 products
      if (successCount % 50 === 0) {
        console.log(`   ✅ Imported ${successCount} products so far...`);
      }
    } catch (error) {
      errors.push({
        row: rowNum,
        sku: finalSku,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log(`\n📊 Import Results:`);
  console.log(`   ✅ Successfully imported: ${successCount} products`);
  console.log(`   ⏭  Skipped (duplicate/missing): ${skipCount} rows`);
  console.log(`   ❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors:`);
    errors.slice(0, 20).forEach((e) => {
      console.log(`   Row ${e.row} [${e.sku}]: ${e.message}`);
    });
    if (errors.length > 20) {
      console.log(`   ... and ${errors.length - 20} more errors`);
    }
  }

  // Invalidate cache
  try {
    const { invalidateOnProductChange } = await import("@/lib/cache");
    await invalidateOnProductChange();
  } catch {
    // Cache module may not be available in script context, ignore
  }

  console.log("\n✅ Import complete!\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Fatal error:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
