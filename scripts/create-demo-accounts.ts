/**
 * Create Demo Accounts (Admin, Client & Supplier)
 *
 * Creates users matching the login page dropdown (`LoginPage` testAccounts).
 * Password for all: 12345678
 *
 * Creates (if not already present):
 *   - test@admin.com     / admin
 *   - test@client.com    / client
 *   - test@supplier.com  / supplier
 *
 * For the supplier portal, links the first existing Supplier to test@supplier.com
 * (or creates "Demo Supplier" if none exist).
 *
 * Usage (DATABASE_URL must point at the same MongoDB as production when seeding prod):
 *   npx tsx scripts/create-demo-accounts.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD_PLAIN = "12345678";

const DEMO_USERS = [
  {
    email: "test@admin.com",
    name: "Test Admin",
    username: "testadmin",
    role: "admin",
    googleId: "demo-admin",
  },
  {
    email: "test@client.com",
    name: "Test Client",
    username: "testclient",
    role: "client",
    googleId: "demo-client", // unique placeholder so User_googleId_key is not violated
  },
  {
    email: "test@supplier.com",
    name: "Test Supplier",
    username: "testsupplier",
    role: "supplier",
    googleId: "demo-supplier",
  },
] as const;

async function main() {
  console.log("\n📦 Create demo accounts (admin + client + supplier)\n");

  const hashedPassword = await bcrypt.hash(PASSWORD_PLAIN, 10);

  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
      select: { id: true, name: true, role: true },
    });

    if (existing) {
      console.log(`   ⏭ ${u.email} already exists (${existing.name}, role: ${existing.role ?? "—"}). Skipping.`);
      continue;
    }

    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        username: u.username,
        password: hashedPassword,
        role: u.role,
        googleId: u.googleId,
        createdAt: new Date(),
      },
    });
    console.log(`   ✅ Created ${u.email} (${u.name}, role: ${u.role})`);
  }

  const supplierUser = await prisma.user.findUnique({
    where: { email: "test@supplier.com" },
    select: { id: true },
  });

  if (supplierUser) {
    const firstSupplier = await prisma.supplier.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    if (firstSupplier) {
      await prisma.supplier.update({
        where: { id: firstSupplier.id },
        data: {
          userId: supplierUser.id,
          createdBy: supplierUser.id,
          updatedBy: supplierUser.id,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ Linked supplier "${firstSupplier.name}" to test@supplier.com`);
    } else {
      await prisma.supplier.create({
        data: {
          name: "Demo Supplier",
          userId: supplierUser.id,
          status: true,
          createdBy: supplierUser.id,
          updatedBy: supplierUser.id,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ Created "Demo Supplier" and linked to test@supplier.com`);
    }
  }

  console.log("\n   Password for all demo accounts: " + PASSWORD_PLAIN);
  console.log("   Login page dropdown: Admin / Client / Supplier.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
