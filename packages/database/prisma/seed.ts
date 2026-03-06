import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const suppliers = [
  {
    name: "Fresh Farms Co.",
    description:
      "Premium organic produce sourced directly from local California farms. Specializing in seasonal vegetables, fruits, and herbs.",
    email: "orders@freshfarms.co",
    phone: "(555) 123-4567",
    address: "1234 Farm Road",
    city: "Sacramento",
    state: "CA",
    zipCode: "95814",
    website: "https://freshfarms.co",
    minimumOrder: 150,
    deliveryFee: 25,
    leadTimeDays: 1,
    status: "VERIFIED" as const,
    rating: 4.8,
    reviewCount: 127,
  },
  {
    name: "Ocean Harvest Seafood",
    description:
      "Daily catches from sustainable fisheries. Fresh fish, shellfish, and specialty seafood delivered same-day.",
    email: "sales@oceanharvest.com",
    phone: "(555) 234-5678",
    address: "500 Wharf Street",
    city: "San Francisco",
    state: "CA",
    zipCode: "94133",
    website: "https://oceanharvest.com",
    minimumOrder: 200,
    deliveryFee: 35,
    leadTimeDays: 1,
    status: "VERIFIED" as const,
    rating: 4.9,
    reviewCount: 89,
  },
  {
    name: "Valley Produce Distributors",
    description:
      "Full-service produce distributor serving restaurants across the Bay Area. Wide selection at competitive prices.",
    email: "info@valleyproduce.net",
    phone: "(555) 345-6789",
    address: "789 Distribution Way",
    city: "Fresno",
    state: "CA",
    zipCode: "93706",
    website: "https://valleyproduce.net",
    minimumOrder: 100,
    deliveryFee: 20,
    leadTimeDays: 2,
    status: "VERIFIED" as const,
    rating: 4.5,
    reviewCount: 203,
  },
  {
    name: "Premium Meats & Poultry",
    description:
      "USDA Prime and Choice cuts, heritage poultry, and specialty meats. Dry-aged options available.",
    email: "orders@premiummeats.com",
    phone: "(555) 456-7890",
    address: "321 Butcher Lane",
    city: "Oakland",
    state: "CA",
    zipCode: "94607",
    website: "https://premiummeats.com",
    minimumOrder: 250,
    deliveryFee: 30,
    leadTimeDays: 1,
    status: "VERIFIED" as const,
    rating: 4.7,
    reviewCount: 156,
  },
  {
    name: "Dairy Direct",
    description:
      "Farm-fresh dairy products including milk, cream, artisan cheeses, butter, and yogurt from local dairies.",
    email: "hello@dairydirect.com",
    phone: "(555) 567-8901",
    address: "456 Creamery Road",
    city: "Petaluma",
    state: "CA",
    zipCode: "94952",
    website: "https://dairydirect.com",
    minimumOrder: 75,
    deliveryFee: 15,
    leadTimeDays: 1,
    status: "VERIFIED" as const,
    rating: 4.6,
    reviewCount: 98,
  },
  {
    name: "Artisan Bakery Supply",
    description:
      "Wholesale bakery ingredients and fresh-baked goods. Flour, yeast, specialty grains, and par-baked breads.",
    email: "wholesale@artisanbakery.com",
    phone: "(555) 678-9012",
    address: "888 Baker Street",
    city: "San Jose",
    state: "CA",
    zipCode: "95112",
    website: "https://artisanbakery.com",
    minimumOrder: 50,
    deliveryFee: 10,
    leadTimeDays: 2,
    status: "VERIFIED" as const,
    rating: 4.4,
    reviewCount: 67,
  },
  {
    name: "Global Spice Traders",
    description:
      "Exotic spices, dried herbs, and specialty seasonings from around the world. Bulk and retail sizes.",
    email: "spices@globaltraders.com",
    phone: "(555) 789-0123",
    address: "999 Import Plaza",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90021",
    website: "https://globalspicetraders.com",
    minimumOrder: 100,
    deliveryFee: 20,
    leadTimeDays: 3,
    status: "VERIFIED" as const,
    rating: 4.8,
    reviewCount: 145,
  },
  {
    name: "Bay Area Beverages",
    description:
      "Complete beverage solutions including soft drinks, juices, coffee, tea, and bar supplies.",
    email: "orders@bayareabev.com",
    phone: "(555) 890-1234",
    address: "222 Beverage Blvd",
    city: "San Leandro",
    state: "CA",
    zipCode: "94577",
    website: "https://bayareabeverages.com",
    minimumOrder: 150,
    deliveryFee: 25,
    leadTimeDays: 2,
    status: "VERIFIED" as const,
    rating: 4.3,
    reviewCount: 112,
  },
];

const productsBySupplier: Record<string, Array<{ name: string; category: string; price: number; unit: string; description?: string }>> = {
  "orders@freshfarms.co": [
    { name: "Organic Mixed Greens", category: "PRODUCE", price: 4.99, unit: "POUND" },
    { name: "Heirloom Tomatoes", category: "PRODUCE", price: 5.99, unit: "POUND" },
    { name: "Fresh Basil", category: "PRODUCE", price: 2.99, unit: "BUNCH" },
    { name: "Organic Carrots", category: "PRODUCE", price: 3.49, unit: "POUND" },
    { name: "Baby Spinach", category: "PRODUCE", price: 6.99, unit: "POUND" },
    { name: "Romaine Lettuce", category: "PRODUCE", price: 2.49, unit: "EACH" },
    { name: "Red Onions", category: "PRODUCE", price: 1.99, unit: "POUND" },
    { name: "Garlic", category: "PRODUCE", price: 4.99, unit: "POUND" },
    { name: "Lemons", category: "PRODUCE", price: 0.50, unit: "EACH" },
    { name: "Limes", category: "PRODUCE", price: 0.40, unit: "EACH" },
    { name: "Fresh Parsley", category: "PRODUCE", price: 1.99, unit: "BUNCH" },
    { name: "Fresh Cilantro", category: "PRODUCE", price: 1.99, unit: "BUNCH" },
    { name: "Asparagus", category: "PRODUCE", price: 4.99, unit: "POUND" },
    { name: "Green Beans", category: "PRODUCE", price: 3.99, unit: "POUND" },
    { name: "Bell Peppers", category: "PRODUCE", price: 1.49, unit: "EACH" },
    { name: "Jalapeños", category: "PRODUCE", price: 2.99, unit: "POUND" },
    { name: "Mushrooms", category: "PRODUCE", price: 5.99, unit: "POUND" },
    { name: "Potatoes", category: "PRODUCE", price: 1.29, unit: "POUND" },
  ],
  "sales@oceanharvest.com": [
    { name: "Atlantic Salmon Fillet", category: "SEAFOOD", price: 14.99, unit: "POUND" },
    { name: "Jumbo Shrimp", category: "SEAFOOD", price: 16.99, unit: "POUND" },
    { name: "Fresh Tuna Steak", category: "SEAFOOD", price: 18.99, unit: "POUND" },
    { name: "Sea Scallops", category: "SEAFOOD", price: 22.99, unit: "POUND" },
    { name: "Mussels", category: "SEAFOOD", price: 6.99, unit: "POUND" },
    { name: "Lobster Tail", category: "SEAFOOD", price: 29.99, unit: "EACH" },
    { name: "Fresh Cod", category: "SEAFOOD", price: 12.99, unit: "POUND" },
    { name: "Crab Meat", category: "SEAFOOD", price: 24.99, unit: "POUND" },
  ],
  "info@valleyproduce.net": [
    { name: "Roma Tomatoes", category: "PRODUCE", price: 3.99, unit: "POUND" },
    { name: "Yellow Onions", category: "PRODUCE", price: 1.49, unit: "POUND" },
    { name: "Celery", category: "PRODUCE", price: 2.49, unit: "BUNCH" },
    { name: "Cucumbers", category: "PRODUCE", price: 0.99, unit: "EACH" },
    { name: "Zucchini", category: "PRODUCE", price: 2.99, unit: "POUND" },
    { name: "Broccoli", category: "PRODUCE", price: 2.99, unit: "POUND" },
    { name: "Cauliflower", category: "PRODUCE", price: 3.49, unit: "EACH" },
    { name: "Cabbage", category: "PRODUCE", price: 1.99, unit: "EACH" },
  ],
  "orders@premiummeats.com": [
    { name: "USDA Prime Ribeye", category: "MEAT", price: 28.99, unit: "POUND" },
    { name: "Filet Mignon", category: "MEAT", price: 34.99, unit: "POUND" },
    { name: "New York Strip", category: "MEAT", price: 24.99, unit: "POUND" },
    { name: "Ground Beef 80/20", category: "MEAT", price: 7.99, unit: "POUND" },
    { name: "Chicken Breast", category: "MEAT", price: 6.99, unit: "POUND" },
    { name: "Chicken Thighs", category: "MEAT", price: 4.99, unit: "POUND" },
    { name: "Pork Tenderloin", category: "MEAT", price: 8.99, unit: "POUND" },
    { name: "Bacon", category: "MEAT", price: 9.99, unit: "POUND" },
    { name: "Italian Sausage", category: "MEAT", price: 7.99, unit: "POUND" },
    { name: "Lamb Chops", category: "MEAT", price: 19.99, unit: "POUND" },
    { name: "Duck Breast", category: "MEAT", price: 16.99, unit: "POUND" },
  ],
  "hello@dairydirect.com": [
    { name: "Heavy Cream", category: "DAIRY", price: 5.99, unit: "QUART" },
    { name: "Whole Milk", category: "DAIRY", price: 4.49, unit: "GALLON" },
    { name: "Unsalted Butter", category: "DAIRY", price: 6.99, unit: "POUND" },
    { name: "Parmesan Cheese", category: "DAIRY", price: 12.99, unit: "POUND" },
    { name: "Mozzarella Cheese", category: "DAIRY", price: 8.99, unit: "POUND" },
    { name: "Cheddar Cheese", category: "DAIRY", price: 7.99, unit: "POUND" },
    { name: "Cream Cheese", category: "DAIRY", price: 4.99, unit: "POUND" },
    { name: "Sour Cream", category: "DAIRY", price: 3.99, unit: "PINT" },
    { name: "Eggs", category: "DAIRY", price: 4.99, unit: "DOZEN" },
    { name: "Greek Yogurt", category: "DAIRY", price: 5.99, unit: "QUART" },
  ],
  "wholesale@artisanbakery.com": [
    { name: "All-Purpose Flour", category: "DRY_GOODS", price: 2.99, unit: "BAG" },
    { name: "Bread Flour", category: "DRY_GOODS", price: 3.49, unit: "BAG" },
    { name: "Sourdough Bread", category: "BAKERY", price: 4.99, unit: "EACH" },
    { name: "Brioche Buns", category: "BAKERY", price: 5.99, unit: "DOZEN" },
    { name: "Croissants", category: "BAKERY", price: 18.99, unit: "DOZEN" },
    { name: "Baguettes", category: "BAKERY", price: 3.49, unit: "EACH" },
    { name: "Ciabatta Rolls", category: "BAKERY", price: 6.99, unit: "DOZEN" },
    { name: "Focaccia", category: "BAKERY", price: 5.99, unit: "EACH" },
  ],
  "spices@globaltraders.com": [
    { name: "Black Pepper", category: "DRY_GOODS", price: 8.99, unit: "POUND" },
    { name: "Kosher Salt", category: "DRY_GOODS", price: 3.99, unit: "BOX" },
    { name: "Cumin", category: "DRY_GOODS", price: 7.99, unit: "POUND" },
    { name: "Paprika", category: "DRY_GOODS", price: 6.99, unit: "POUND" },
    { name: "Oregano", category: "DRY_GOODS", price: 5.99, unit: "POUND" },
    { name: "Thyme", category: "DRY_GOODS", price: 6.99, unit: "POUND" },
    { name: "Rosemary", category: "DRY_GOODS", price: 6.99, unit: "POUND" },
    { name: "Cayenne Pepper", category: "DRY_GOODS", price: 7.99, unit: "POUND" },
    { name: "Olive Oil Extra Virgin", category: "DRY_GOODS", price: 14.99, unit: "GALLON" },
    { name: "Vegetable Oil", category: "DRY_GOODS", price: 8.99, unit: "GALLON" },
    { name: "Balsamic Vinegar", category: "DRY_GOODS", price: 9.99, unit: "LITER" },
    { name: "Red Wine Vinegar", category: "DRY_GOODS", price: 6.99, unit: "LITER" },
    { name: "Soy Sauce", category: "DRY_GOODS", price: 5.99, unit: "LITER" },
  ],
  "orders@bayareabev.com": [
    { name: "Orange Juice", category: "BEVERAGES", price: 12.99, unit: "GALLON" },
    { name: "Cranberry Juice", category: "BEVERAGES", price: 8.99, unit: "GALLON" },
    { name: "Coffee Beans", category: "BEVERAGES", price: 14.99, unit: "POUND" },
    { name: "Black Tea", category: "BEVERAGES", price: 12.99, unit: "POUND" },
    { name: "Sparkling Water", category: "BEVERAGES", price: 24.99, unit: "CASE" },
    { name: "Lemonade", category: "BEVERAGES", price: 9.99, unit: "GALLON" },
  ],
};

async function main() {
  console.log("Seeding database...");

  // Create suppliers
  for (const supplier of suppliers) {
    const existing = await prisma.supplier.findUnique({
      where: { email: supplier.email },
    });

    if (!existing) {
      await prisma.supplier.create({
        data: {
          ...supplier,
          verifiedAt: new Date(),
        },
      });
      console.log(`Created supplier: ${supplier.name}`);
    } else {
      console.log(`Supplier already exists: ${supplier.name}`);
    }
  }

  // Add products to all suppliers
  for (const [supplierEmail, products] of Object.entries(productsBySupplier)) {
    const supplier = await prisma.supplier.findUnique({
      where: { email: supplierEmail },
    });

    if (supplier) {
      for (const product of products) {
        const existing = await prisma.supplierProduct.findFirst({
          where: {
            supplierId: supplier.id,
            name: product.name,
          },
        });

        if (!existing) {
          await prisma.supplierProduct.create({
            data: {
              name: product.name,
              category: product.category as any,
              price: product.price,
              unit: product.unit as any,
              description: product.description,
              supplierId: supplier.id,
              inStock: true,
            },
          });
          console.log(`Created product: ${product.name} for ${supplier.name}`);
        }
      }
    }
  }

  // ============================================================
  // EXPANDED SEED DATA — Organization, Restaurants, Users, etc.
  // ============================================================

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // --- 1. Organization ---
  console.log("\nSeeding organization...");
  const org = await prisma.organization.upsert({
    where: { slug: "freshsheet-demo" },
    update: {},
    create: {
      name: "FreshSheet Demo Org",
      slug: "freshsheet-demo",
    },
  });
  console.log(`Organization: ${org.name}`);

  // --- 2. Restaurants ---
  console.log("\nSeeding restaurants...");
  const goldenFork = await prisma.restaurant.upsert({
    where: { id: "seed_restaurant_golden_fork" },
    update: {},
    create: {
      id: "seed_restaurant_golden_fork",
      name: "The Golden Fork",
      address: "456 Market Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      phone: "(415) 555-0100",
      email: "info@goldenfork.com",
      cuisineTypes: ["American", "Italian", "Seafood"],
      seatingCapacity: 85,
      planTier: "PROFESSIONAL" as any,
      organizationId: org.id,
    },
  });
  console.log(`Restaurant: ${goldenFork.name}`);

  const bistroNouveau = await prisma.restaurant.upsert({
    where: { id: "seed_restaurant_bistro_nouveau" },
    update: {},
    create: {
      id: "seed_restaurant_bistro_nouveau",
      name: "Bistro Nouveau",
      address: "789 Valencia Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94110",
      phone: "(415) 555-0200",
      email: "hello@bistronouveau.com",
      cuisineTypes: ["French", "Mediterranean"],
      seatingCapacity: 45,
      planTier: "STARTER" as any,
      organizationId: org.id,
    },
  });
  console.log(`Restaurant: ${bistroNouveau.name}`);

  // --- 3. Users ---
  console.log("\nSeeding users...");

  // Fetch suppliers needed for user assignment
  const freshFarms = await prisma.supplier.findUnique({ where: { email: "orders@freshfarms.co" } });
  const oceanHarvest = await prisma.supplier.findUnique({ where: { email: "sales@oceanharvest.com" } });
  const premiumMeats = await prisma.supplier.findUnique({ where: { email: "orders@premiummeats.com" } });
  const dairyDirect = await prisma.supplier.findUnique({ where: { email: "hello@dairydirect.com" } });
  const valleyProduce = await prisma.supplier.findUnique({ where: { email: "info@valleyproduce.net" } });

  if (!freshFarms || !oceanHarvest || !premiumMeats || !dairyDirect || !valleyProduce) {
    throw new Error("Required suppliers not found — run base seed first");
  }

  const userDefs = [
    // Golden Fork team
    { clerkId: "seed_owner_1", email: "alex.chen@goldenfork.com", firstName: "Alex", lastName: "Chen", role: "OWNER" as any, restaurantId: goldenFork.id, organizationId: org.id },
    { clerkId: "seed_manager_1", email: "sarah.miller@goldenfork.com", firstName: "Sarah", lastName: "Miller", role: "MANAGER" as any, restaurantId: goldenFork.id, organizationId: org.id },
    { clerkId: "seed_staff_1", email: "jordan.lee@goldenfork.com", firstName: "Jordan", lastName: "Lee", role: "STAFF" as any, restaurantId: goldenFork.id, organizationId: org.id },
    { clerkId: "seed_staff_2", email: "maria.garcia@goldenfork.com", firstName: "Maria", lastName: "Garcia", role: "STAFF" as any, restaurantId: goldenFork.id, organizationId: org.id },
    { clerkId: "staff_pending_seed_1", email: "pending@goldenfork.com", firstName: null, lastName: null, role: "STAFF" as any, restaurantId: goldenFork.id, organizationId: org.id },
    // Bistro Nouveau team
    { clerkId: "seed_owner_2", email: "emma.davis@bistronouveau.com", firstName: "Emma", lastName: "Davis", role: "OWNER" as any, restaurantId: bistroNouveau.id, organizationId: org.id },
    { clerkId: "seed_manager_2", email: "james.brown@bistronouveau.com", firstName: "James", lastName: "Brown", role: "MANAGER" as any, restaurantId: bistroNouveau.id, organizationId: org.id },
    // Fresh Farms supplier users
    { clerkId: "seed_supplier_admin_1", email: "tom.wilson@freshfarms.co", firstName: "Tom", lastName: "Wilson", role: "SUPPLIER_ADMIN" as any, supplierId: freshFarms.id },
    { clerkId: "seed_supplier_rep_1", email: "lisa.park@freshfarms.co", firstName: "Lisa", lastName: "Park", role: "SUPPLIER_REP" as any, supplierId: freshFarms.id },
    { clerkId: "driver_pending_seed_1", email: "mike.johnson@freshfarms.co", firstName: "Mike", lastName: "Johnson", role: "DRIVER" as any, supplierId: freshFarms.id },
  ];

  const users: Record<string, any> = {};
  for (const u of userDefs) {
    const existing = await prisma.user.findUnique({ where: { clerkId: u.clerkId } });
    if (!existing) {
      users[u.clerkId] = await prisma.user.create({ data: u });
      console.log(`Created user: ${u.firstName ?? u.clerkId} ${u.lastName ?? ""}`);
    } else {
      users[u.clerkId] = existing;
      console.log(`User already exists: ${u.clerkId}`);
    }
  }

  // Shorthand references
  const alexChen = users["seed_owner_1"];
  const sarahMiller = users["seed_manager_1"];
  const jordanLee = users["seed_staff_1"];
  const tomWilson = users["seed_supplier_admin_1"];
  const lisaPark = users["seed_supplier_rep_1"];
  const mikeJohnson = users["driver_pending_seed_1"];

  // --- 4. RestaurantSupplier Links ---
  console.log("\nSeeding restaurant-supplier links...");
  const rsLinks = [
    { restaurantId: goldenFork.id, supplierId: freshFarms.id, isPreferred: true },
    { restaurantId: goldenFork.id, supplierId: oceanHarvest.id, isPreferred: false },
    { restaurantId: goldenFork.id, supplierId: premiumMeats.id, isPreferred: false },
    { restaurantId: goldenFork.id, supplierId: dairyDirect.id, isPreferred: false },
    { restaurantId: bistroNouveau.id, supplierId: freshFarms.id, isPreferred: false },
    { restaurantId: bistroNouveau.id, supplierId: valleyProduce.id, isPreferred: false },
  ];
  for (const link of rsLinks) {
    const existing = await prisma.restaurantSupplier.findFirst({
      where: { restaurantId: link.restaurantId, supplierId: link.supplierId },
    });
    if (!existing) {
      await prisma.restaurantSupplier.create({ data: link });
      console.log(`Linked restaurant ${link.restaurantId} → supplier ${link.supplierId}`);
    }
  }

  // --- 5. DeliveryZones ---
  console.log("\nSeeding delivery zones...");
  const zones = [
    { name: "Downtown", zipCodes: ["94102", "94103", "94104"], deliveryFee: 15, minimumOrder: 100, supplierId: freshFarms.id },
    { name: "Midtown", zipCodes: ["94108", "94109", "94110"], deliveryFee: 20, minimumOrder: 125, supplierId: freshFarms.id },
    { name: "Outer Districts", zipCodes: ["94112", "94114", "94116"], deliveryFee: 30, minimumOrder: 150, supplierId: freshFarms.id },
  ];
  for (const zone of zones) {
    const existing = await prisma.deliveryZone.findFirst({
      where: { name: zone.name, supplierId: zone.supplierId },
    });
    if (!existing) {
      await prisma.deliveryZone.create({ data: zone });
      console.log(`Created delivery zone: ${zone.name}`);
    }
  }

  // --- 6. ApprovalRules ---
  console.log("\nSeeding approval rules...");
  const approvalRules = [
    { minAmount: 500, maxAmount: 999.99, requiredRole: "MANAGER" as any, restaurantId: goldenFork.id },
    { minAmount: 1000, maxAmount: null, requiredRole: "OWNER" as any, restaurantId: goldenFork.id },
  ];
  for (const rule of approvalRules) {
    const existing = await prisma.approvalRule.findFirst({
      where: { minAmount: rule.minAmount, restaurantId: rule.restaurantId },
    });
    if (!existing) {
      await prisma.approvalRule.create({ data: rule });
      console.log(`Created approval rule: $${rule.minAmount}+ → ${rule.requiredRole}`);
    }
  }

  // --- 7. InventoryItems ---
  console.log("\nSeeding inventory items...");

  // Fetch supplier products we'll link to inventory
  const findProduct = async (supplierEmail: string, productName: string) => {
    const supplier = await prisma.supplier.findUnique({ where: { email: supplierEmail } });
    if (!supplier) return null;
    return prisma.supplierProduct.findFirst({
      where: { supplierId: supplier.id, name: productName },
    });
  };

  const mixedGreens = await findProduct("orders@freshfarms.co", "Organic Mixed Greens");
  const heirloomTomatoes = await findProduct("orders@freshfarms.co", "Heirloom Tomatoes");
  const freshBasil = await findProduct("orders@freshfarms.co", "Fresh Basil");
  const babySpinach = await findProduct("orders@freshfarms.co", "Baby Spinach");
  const mushrooms = await findProduct("orders@freshfarms.co", "Mushrooms");
  const atlanticSalmon = await findProduct("sales@oceanharvest.com", "Atlantic Salmon Fillet");
  const jumboShrimp = await findProduct("sales@oceanharvest.com", "Jumbo Shrimp");
  const chickenBreast = await findProduct("orders@premiummeats.com", "Chicken Breast");
  const groundBeef = await findProduct("orders@premiummeats.com", "Ground Beef 80/20");
  const heavyCream = await findProduct("hello@dairydirect.com", "Heavy Cream");
  const parmesanCheese = await findProduct("hello@dairydirect.com", "Parmesan Cheese");
  const mozzarellaCheese = await findProduct("hello@dairydirect.com", "Mozzarella Cheese");

  const inventoryDefs = [
    { name: "Organic Mixed Greens", category: "PRODUCE" as any, currentQuantity: 8, unit: "POUND" as any, parLevel: 15, costPerUnit: 4.99, location: "Walk-in Cooler", restaurantId: goldenFork.id, supplierProductId: mixedGreens?.id },
    { name: "Heirloom Tomatoes", category: "PRODUCE" as any, currentQuantity: 12, unit: "POUND" as any, parLevel: 20, costPerUnit: 5.99, location: "Walk-in Cooler", restaurantId: goldenFork.id, supplierProductId: heirloomTomatoes?.id },
    { name: "Fresh Basil", category: "PRODUCE" as any, currentQuantity: 3, unit: "BUNCH" as any, parLevel: 8, costPerUnit: 2.99, location: "Walk-in Cooler", restaurantId: goldenFork.id, supplierProductId: freshBasil?.id },
    { name: "Baby Spinach", category: "PRODUCE" as any, currentQuantity: 4, unit: "POUND" as any, parLevel: 10, costPerUnit: 6.99, location: "Walk-in Cooler", restaurantId: goldenFork.id, supplierProductId: babySpinach?.id },
    { name: "Mushrooms", category: "PRODUCE" as any, currentQuantity: 6, unit: "POUND" as any, parLevel: 8, costPerUnit: 5.99, location: "Walk-in Cooler", restaurantId: goldenFork.id, supplierProductId: mushrooms?.id },
    { name: "Atlantic Salmon Fillet", category: "SEAFOOD" as any, currentQuantity: 5, unit: "POUND" as any, parLevel: 15, costPerUnit: 14.99, location: "Walk-in Freezer", restaurantId: goldenFork.id, supplierProductId: atlanticSalmon?.id },
    { name: "Jumbo Shrimp", category: "SEAFOOD" as any, currentQuantity: 3, unit: "POUND" as any, parLevel: 10, costPerUnit: 16.99, location: "Walk-in Freezer", restaurantId: goldenFork.id, supplierProductId: jumboShrimp?.id },
    { name: "Chicken Breast", category: "MEAT" as any, currentQuantity: 10, unit: "POUND" as any, parLevel: 20, costPerUnit: 6.99, location: "Walk-in Freezer", restaurantId: goldenFork.id, supplierProductId: chickenBreast?.id },
    { name: "Ground Beef 80/20", category: "MEAT" as any, currentQuantity: 8, unit: "POUND" as any, parLevel: 15, costPerUnit: 7.99, location: "Walk-in Freezer", restaurantId: goldenFork.id, supplierProductId: groundBeef?.id },
    { name: "Heavy Cream", category: "DAIRY" as any, currentQuantity: 2, unit: "QUART" as any, parLevel: 6, costPerUnit: 5.99, location: "Walk-in Cooler", restaurantId: goldenFork.id, supplierProductId: heavyCream?.id },
    { name: "Parmesan Cheese", category: "DAIRY" as any, currentQuantity: 3, unit: "POUND" as any, parLevel: 5, costPerUnit: 12.99, location: "Walk-in Cooler", restaurantId: goldenFork.id, supplierProductId: parmesanCheese?.id },
    { name: "Mozzarella Cheese", category: "DAIRY" as any, currentQuantity: 4, unit: "POUND" as any, parLevel: 8, costPerUnit: 8.99, location: "Walk-in Cooler", restaurantId: goldenFork.id, supplierProductId: mozzarellaCheese?.id },
  ];

  const inventoryItems: Record<string, any> = {};
  for (const inv of inventoryDefs) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { name: inv.name, restaurantId: inv.restaurantId },
    });
    if (!existing) {
      inventoryItems[inv.name] = await prisma.inventoryItem.create({ data: inv });
      console.log(`Created inventory item: ${inv.name}`);
    } else {
      inventoryItems[inv.name] = existing;
    }
  }

  // --- 8. InventoryLogs ---
  console.log("\nSeeding inventory logs...");
  const invLogDefs = [
    { changeType: "USED" as any, quantity: 3, previousQuantity: 11, newQuantity: 8, notes: "Dinner service", inventoryItemId: inventoryItems["Organic Mixed Greens"]?.id, createdById: jordanLee.id, createdAt: daysAgo(1) },
    { changeType: "RECEIVED" as any, quantity: 20, previousQuantity: 5, newQuantity: 25, notes: "Fresh Farms delivery", reference: "ORD-10004", inventoryItemId: inventoryItems["Heirloom Tomatoes"]?.id, createdById: sarahMiller.id, createdAt: daysAgo(3) },
    { changeType: "WASTE" as any, quantity: 2, previousQuantity: 5, newQuantity: 3, notes: "Wilted — past date", inventoryItemId: inventoryItems["Fresh Basil"]?.id, createdById: jordanLee.id, createdAt: daysAgo(2) },
    { changeType: "USED" as any, quantity: 5, previousQuantity: 9, newQuantity: 4, notes: "Lunch prep", inventoryItemId: inventoryItems["Baby Spinach"]?.id, createdById: jordanLee.id, createdAt: daysAgo(1) },
    { changeType: "RECEIVED" as any, quantity: 10, previousQuantity: 0, newQuantity: 10, notes: "Premium Meats delivery", inventoryItemId: inventoryItems["Chicken Breast"]?.id, createdById: sarahMiller.id, createdAt: daysAgo(4) },
    { changeType: "COUNT" as any, quantity: 0, previousQuantity: 9, newQuantity: 8, notes: "Weekly count adjustment", inventoryItemId: inventoryItems["Ground Beef 80/20"]?.id, createdById: sarahMiller.id, createdAt: daysAgo(7) },
    { changeType: "USED" as any, quantity: 4, previousQuantity: 6, newQuantity: 2, notes: "Weekend brunch service", inventoryItemId: inventoryItems["Heavy Cream"]?.id, createdById: jordanLee.id, createdAt: daysAgo(2) },
    { changeType: "USED" as any, quantity: 2, previousQuantity: 5, newQuantity: 3, notes: "Pasta service", inventoryItemId: inventoryItems["Parmesan Cheese"]?.id, createdById: jordanLee.id, createdAt: daysAgo(1) },
  ];
  for (const log of invLogDefs) {
    if (!log.inventoryItemId) continue;
    const existingCount = await prisma.inventoryLog.count({
      where: { inventoryItemId: log.inventoryItemId },
    });
    if (existingCount === 0) {
      await prisma.inventoryLog.create({ data: log });
      console.log(`Created inventory log: ${log.changeType} for item ${log.inventoryItemId}`);
    }
  }

  // --- 9. MenuItems + Ingredients ---
  console.log("\nSeeding menu items...");

  const menuItemDefs = [
    {
      name: "Caesar Salad", price: 14.50, category: "SALADS", restaurantId: goldenFork.id,
      description: "Crisp romaine, house-made dressing, shaved parmesan, garlic croutons",
      ingredients: [
        { name: "Romaine Lettuce", quantity: 0.5, unit: "POUND" as any, supplierProductName: "Romaine Lettuce", supplierEmail: "orders@freshfarms.co" },
        { name: "Parmesan Cheese", quantity: 0.125, unit: "POUND" as any, supplierProductName: "Parmesan Cheese", supplierEmail: "hello@dairydirect.com" },
        { name: "Lemons", quantity: 1, unit: "EACH" as any, supplierProductName: "Lemons", supplierEmail: "orders@freshfarms.co" },
      ],
    },
    {
      name: "Grilled Salmon", price: 28.00, category: "ENTREES", restaurantId: goldenFork.id,
      description: "Wild-caught salmon, lemon butter sauce, seasonal vegetables, rice pilaf",
      ingredients: [
        { name: "Atlantic Salmon Fillet", quantity: 0.5, unit: "POUND" as any, supplierProductName: "Atlantic Salmon Fillet", supplierEmail: "sales@oceanharvest.com" },
        { name: "Unsalted Butter", quantity: 0.0625, unit: "POUND" as any, supplierProductName: "Unsalted Butter", supplierEmail: "hello@dairydirect.com" },
        { name: "Asparagus", quantity: 0.25, unit: "POUND" as any, supplierProductName: "Asparagus", supplierEmail: "orders@freshfarms.co" },
      ],
    },
    {
      name: "Margherita Pizza", price: 16.00, category: "ENTREES", restaurantId: goldenFork.id,
      description: "San Marzano tomatoes, fresh mozzarella, basil, extra virgin olive oil",
      ingredients: [
        { name: "Mozzarella Cheese", quantity: 0.375, unit: "POUND" as any, supplierProductName: "Mozzarella Cheese", supplierEmail: "hello@dairydirect.com" },
        { name: "Heirloom Tomatoes", quantity: 0.5, unit: "POUND" as any, supplierProductName: "Heirloom Tomatoes", supplierEmail: "orders@freshfarms.co" },
        { name: "Fresh Basil", quantity: 0.25, unit: "BUNCH" as any, supplierProductName: "Fresh Basil", supplierEmail: "orders@freshfarms.co" },
      ],
    },
    {
      name: "Mushroom Risotto", price: 22.00, category: "ENTREES", restaurantId: goldenFork.id,
      description: "Arborio rice, wild mushroom medley, parmesan, truffle oil",
      ingredients: [
        { name: "Mushrooms", quantity: 0.5, unit: "POUND" as any, supplierProductName: "Mushrooms", supplierEmail: "orders@freshfarms.co" },
        { name: "Parmesan Cheese", quantity: 0.125, unit: "POUND" as any, supplierProductName: "Parmesan Cheese", supplierEmail: "hello@dairydirect.com" },
        { name: "Heavy Cream", quantity: 0.25, unit: "QUART" as any, supplierProductName: "Heavy Cream", supplierEmail: "hello@dairydirect.com" },
      ],
    },
    {
      name: "Chocolate Lava Cake", price: 12.00, category: "DESSERTS", restaurantId: goldenFork.id,
      description: "Warm dark chocolate cake with molten center, vanilla ice cream",
      ingredients: [
        { name: "Eggs", quantity: 2, unit: "EACH" as any, supplierProductName: "Eggs", supplierEmail: "hello@dairydirect.com" },
        { name: "Unsalted Butter", quantity: 0.125, unit: "POUND" as any, supplierProductName: "Unsalted Butter", supplierEmail: "hello@dairydirect.com" },
        { name: "Heavy Cream", quantity: 0.125, unit: "QUART" as any, supplierProductName: "Heavy Cream", supplierEmail: "hello@dairydirect.com" },
      ],
    },
    {
      name: "House Burger", price: 18.50, category: "ENTREES", restaurantId: goldenFork.id,
      description: "Double smash patty, aged cheddar, special sauce, brioche bun",
      ingredients: [
        { name: "Ground Beef 80/20", quantity: 0.5, unit: "POUND" as any, supplierProductName: "Ground Beef 80/20", supplierEmail: "orders@premiummeats.com" },
        { name: "Cheddar Cheese", quantity: 0.125, unit: "POUND" as any, supplierProductName: "Cheddar Cheese", supplierEmail: "hello@dairydirect.com" },
        { name: "Brioche Buns", quantity: 1, unit: "EACH" as any, supplierProductName: "Brioche Buns", supplierEmail: "wholesale@artisanbakery.com" },
      ],
    },
  ];

  for (const mi of menuItemDefs) {
    const existing = await prisma.menuItem.findFirst({
      where: { name: mi.name, restaurantId: mi.restaurantId },
    });
    if (!existing) {
      // Resolve supplierProduct IDs for ingredients
      const ingredientData = [];
      for (const ing of mi.ingredients) {
        const sp = await findProduct(ing.supplierEmail, ing.supplierProductName);
        ingredientData.push({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          supplierProductId: sp?.id ?? undefined,
        });
      }
      await prisma.menuItem.create({
        data: {
          name: mi.name,
          price: mi.price,
          category: mi.category,
          description: mi.description,
          restaurantId: mi.restaurantId,
          ingredients: { create: ingredientData },
        },
      });
      console.log(`Created menu item: ${mi.name} with ${ingredientData.length} ingredients`);
    }
  }

  // --- 10. Orders + OrderItems ---
  console.log("\nSeeding orders...");

  // Helper: find supplier product by supplier email and product name
  const getProduct = async (supplierEmail: string, productName: string) => {
    const sp = await findProduct(supplierEmail, productName);
    if (!sp) throw new Error(`Product not found: ${productName} from ${supplierEmail}`);
    return sp;
  };

  // Build orders only if none exist yet
  const existingOrderCount = await prisma.order.count({
    where: { orderNumber: { startsWith: "ORD-1000" } },
  });

  if (existingOrderCount === 0) {
    // Fetch products needed for order items
    const p_mixedGreens = await getProduct("orders@freshfarms.co", "Organic Mixed Greens");
    const p_tomatoes = await getProduct("orders@freshfarms.co", "Heirloom Tomatoes");
    const p_basil = await getProduct("orders@freshfarms.co", "Fresh Basil");
    const p_carrots = await getProduct("orders@freshfarms.co", "Organic Carrots");
    const p_spinach = await getProduct("orders@freshfarms.co", "Baby Spinach");
    const p_mushrooms = await getProduct("orders@freshfarms.co", "Mushrooms");
    const p_salmon = await getProduct("sales@oceanharvest.com", "Atlantic Salmon Fillet");
    const p_shrimp = await getProduct("sales@oceanharvest.com", "Jumbo Shrimp");
    const p_cod = await getProduct("sales@oceanharvest.com", "Fresh Cod");
    const p_ribeye = await getProduct("orders@premiummeats.com", "USDA Prime Ribeye");
    const p_filet = await getProduct("orders@premiummeats.com", "Filet Mignon");
    const p_chicken = await getProduct("orders@premiummeats.com", "Chicken Breast");
    const p_bacon = await getProduct("orders@premiummeats.com", "Bacon");
    const p_cream = await getProduct("hello@dairydirect.com", "Heavy Cream");
    const p_butter = await getProduct("hello@dairydirect.com", "Unsalted Butter");
    const p_parmesan = await getProduct("hello@dairydirect.com", "Parmesan Cheese");
    const p_mozzarella = await getProduct("hello@dairydirect.com", "Mozzarella Cheese");
    const p_eggs = await getProduct("hello@dairydirect.com", "Eggs");

    type OrderDef = {
      orderNumber: string;
      status: string;
      supplierId: string;
      createdById: string;
      deliveryDate: Date | null;
      deliveredAt: Date | null;
      deliveryNotes: string | null;
      driverId: string | null;
      createdAt: Date;
      items: Array<{ productId: string; quantity: number; unitPrice: number }>;
    };

    const orderDefs: OrderDef[] = [
      {
        orderNumber: "ORD-10001", status: "DRAFT", supplierId: freshFarms.id,
        createdById: jordanLee.id, deliveryDate: daysAgo(-2), deliveredAt: null,
        deliveryNotes: "Ready for review", driverId: null, createdAt: daysAgo(1),
        items: [
          { productId: p_mixedGreens.id, quantity: 15, unitPrice: 4.99 },
          { productId: p_tomatoes.id, quantity: 10, unitPrice: 5.99 },
          { productId: p_basil.id, quantity: 5, unitPrice: 2.99 },
          { productId: p_carrots.id, quantity: 8, unitPrice: 3.49 },
        ],
      },
      {
        orderNumber: "ORD-10002", status: "AWAITING_APPROVAL", supplierId: premiumMeats.id,
        createdById: jordanLee.id, deliveryDate: daysAgo(-3), deliveredAt: null,
        deliveryNotes: "Over $500 — needs manager/owner approval", driverId: null, createdAt: daysAgo(2),
        items: [
          { productId: p_ribeye.id, quantity: 10, unitPrice: 28.99 },
          { productId: p_filet.id, quantity: 8, unitPrice: 34.99 },
        ],
      },
      {
        orderNumber: "ORD-10003", status: "PENDING", supplierId: oceanHarvest.id,
        createdById: sarahMiller.id, deliveryDate: daysAgo(-2), deliveredAt: null,
        deliveryNotes: "Please deliver to back entrance", driverId: null, createdAt: daysAgo(3),
        items: [
          { productId: p_salmon.id, quantity: 10, unitPrice: 14.99 },
          { productId: p_shrimp.id, quantity: 5, unitPrice: 16.99 },
          { productId: p_cod.id, quantity: 5, unitPrice: 12.99 },
        ],
      },
      {
        orderNumber: "ORD-10004", status: "CONFIRMED", supplierId: freshFarms.id,
        createdById: sarahMiller.id, deliveryDate: daysAgo(-1), deliveredAt: null,
        deliveryNotes: null, driverId: null, createdAt: daysAgo(4),
        items: [
          { productId: p_spinach.id, quantity: 15, unitPrice: 6.99 },
          { productId: p_mushrooms.id, quantity: 10, unitPrice: 5.99 },
        ],
      },
      {
        orderNumber: "ORD-10005", status: "PROCESSING", supplierId: dairyDirect.id,
        createdById: jordanLee.id, deliveryDate: daysAgo(-1), deliveredAt: null,
        deliveryNotes: "Keep refrigerated", driverId: null, createdAt: daysAgo(5),
        items: [
          { productId: p_cream.id, quantity: 8, unitPrice: 5.99 },
          { productId: p_butter.id, quantity: 5, unitPrice: 6.99 },
          { productId: p_eggs.id, quantity: 4, unitPrice: 4.99 },
        ],
      },
      {
        orderNumber: "ORD-10006", status: "IN_TRANSIT", supplierId: freshFarms.id,
        createdById: alexChen.id, deliveryDate: now, deliveredAt: null,
        deliveryNotes: "ETA 2pm today", driverId: mikeJohnson.id, createdAt: daysAgo(6),
        items: [
          { productId: p_mixedGreens.id, quantity: 20, unitPrice: 4.99 },
          { productId: p_tomatoes.id, quantity: 15, unitPrice: 5.99 },
          { productId: p_basil.id, quantity: 10, unitPrice: 2.99 },
        ],
      },
      {
        orderNumber: "ORD-10007", status: "DELIVERED", supplierId: freshFarms.id,
        createdById: sarahMiller.id, deliveryDate: daysAgo(6), deliveredAt: daysAgo(5),
        deliveryNotes: "Delivered to walk-in cooler", driverId: mikeJohnson.id, createdAt: daysAgo(8),
        items: [
          { productId: p_mixedGreens.id, quantity: 25, unitPrice: 4.99 },
          { productId: p_carrots.id, quantity: 20, unitPrice: 3.49 },
          { productId: p_spinach.id, quantity: 15, unitPrice: 6.99 },
        ],
      },
      {
        orderNumber: "ORD-10008", status: "DELIVERED", supplierId: premiumMeats.id,
        createdById: jordanLee.id, deliveryDate: daysAgo(11), deliveredAt: daysAgo(10),
        deliveryNotes: "All items received in good condition", driverId: null, createdAt: daysAgo(14),
        items: [
          { productId: p_ribeye.id, quantity: 8, unitPrice: 28.99 },
          { productId: p_chicken.id, quantity: 15, unitPrice: 6.99 },
          { productId: p_bacon.id, quantity: 10, unitPrice: 9.99 },
        ],
      },
    ];

    const createdOrders: Record<string, any> = {};

    for (const od of orderDefs) {
      const subtotal = od.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const tax = Math.round(subtotal * 0.0875 * 100) / 100;
      const deliveryFee = 25;
      const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

      const order = await prisma.order.create({
        data: {
          orderNumber: od.orderNumber,
          status: od.status as any,
          subtotal,
          tax,
          deliveryFee,
          discount: 0,
          total,
          deliveryDate: od.deliveryDate,
          deliveredAt: od.deliveredAt,
          deliveryNotes: od.deliveryNotes,
          restaurantId: goldenFork.id,
          supplierId: od.supplierId,
          createdById: od.createdById,
          driverId: od.driverId,
          createdAt: od.createdAt,
          items: {
            create: od.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: Math.round(i.quantity * i.unitPrice * 100) / 100,
            })),
          },
        },
      });
      createdOrders[od.orderNumber] = order;
      console.log(`Created order: ${od.orderNumber} (${od.status}) — $${total}`);
    }

    // --- 11. OrderApprovals ---
    console.log("\nSeeding order approvals...");

    // PENDING approval on order #2 (AWAITING_APPROVAL)
    await prisma.orderApproval.create({
      data: {
        status: "PENDING" as any,
        notes: "Large meat order — requires manager approval",
        orderId: createdOrders["ORD-10002"].id,
        requestedById: jordanLee.id,
      },
    });
    console.log("Created PENDING approval on ORD-10002");

    // APPROVED approval on order #8 (DELIVERED)
    await prisma.orderApproval.create({
      data: {
        status: "APPROVED" as any,
        notes: "Approved for weekly meat stock",
        orderId: createdOrders["ORD-10008"].id,
        requestedById: jordanLee.id,
        reviewedById: alexChen.id,
        reviewedAt: daysAgo(13),
      },
    });
    console.log("Created APPROVED approval on ORD-10008");

    // --- 12. Invoices ---
    console.log("\nSeeding invoices...");

    const order7 = createdOrders["ORD-10007"];
    const order8 = createdOrders["ORD-10008"];
    const order6 = createdOrders["ORD-10006"];

    await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-20001",
        status: "PENDING" as any,
        subtotal: Number(order7.subtotal),
        tax: Number(order7.tax),
        total: Number(order7.total),
        dueDate: daysAgo(-10),
        restaurantId: goldenFork.id,
        supplierId: freshFarms.id,
        orderId: order7.id,
      },
    });
    console.log("Created PENDING invoice INV-20001 for ORD-10007");

    await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-20002",
        status: "PAID" as any,
        subtotal: Number(order8.subtotal),
        tax: Number(order8.tax),
        total: Number(order8.total),
        dueDate: daysAgo(3),
        paidAt: daysAgo(5),
        paidAmount: Number(order8.total),
        paymentMethod: "BANK_TRANSFER" as any,
        paymentReference: "TXN-889742",
        restaurantId: goldenFork.id,
        supplierId: premiumMeats.id,
        orderId: order8.id,
      },
    });
    console.log("Created PAID invoice INV-20002 for ORD-10008");

    await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-20003",
        status: "OVERDUE" as any,
        subtotal: Number(order6.subtotal),
        tax: Number(order6.tax),
        total: Number(order6.total),
        dueDate: daysAgo(2),
        restaurantId: goldenFork.id,
        supplierId: freshFarms.id,
        orderId: order6.id,
      },
    });
    console.log("Created OVERDUE invoice INV-20003 for ORD-10006");

    // --- 13. ReturnRequests ---
    console.log("\nSeeding return requests...");

    await prisma.returnRequest.create({
      data: {
        returnNumber: "RET-30001",
        type: "QUALITY_ISSUE" as any,
        status: "PENDING" as any,
        reason: "Several heads of lettuce were wilted and discolored upon delivery. Approximately 5 lbs affected.",
        items: JSON.parse('[{"name":"Organic Mixed Greens","quantity":5,"unit":"POUND"}]'),
        orderId: order7.id,
        createdById: sarahMiller.id,
        createdAt: daysAgo(4),
      },
    });
    console.log("Created PENDING return RET-30001 on ORD-10007");

    await prisma.returnRequest.create({
      data: {
        returnNumber: "RET-30002",
        type: "DAMAGED" as any,
        status: "APPROVED" as any,
        reason: "Box of chicken breast was damaged during transit. Packaging was torn and product was exposed.",
        items: JSON.parse('[{"name":"Chicken Breast","quantity":5,"unit":"POUND"}]'),
        creditAmount: 34.95,
        creditNotes: "Credit applied to next order",
        resolution: "Full credit issued for damaged items",
        resolvedAt: daysAgo(8),
        orderId: order8.id,
        createdById: jordanLee.id,
        reviewedById: tomWilson.id,
        reviewedAt: daysAgo(8),
        createdAt: daysAgo(9),
      },
    });
    console.log("Created APPROVED return RET-30002 on ORD-10008");

    // --- 14. OrderMessages ---
    console.log("\nSeeding order messages...");

    const order4 = createdOrders["ORD-10004"];
    const order3 = createdOrders["ORD-10003"];

    await prisma.orderMessage.create({
      data: {
        content: "Hi, can you confirm the delivery window for tomorrow? We need it before the lunch rush at 11am.",
        orderId: order4.id,
        senderId: sarahMiller.id,
        isInternal: false,
        createdAt: daysAgo(3),
      },
    });
    await prisma.orderMessage.create({
      data: {
        content: "Confirmed! Delivery is scheduled between 8-9am. Driver will call when 15 minutes out.",
        orderId: order4.id,
        senderId: lisaPark.id,
        isInternal: false,
        createdAt: daysAgo(3),
      },
    });
    await prisma.orderMessage.create({
      data: {
        content: "Internal note: Check if we can substitute fresh tuna for yellowtail if out of stock.",
        orderId: order3.id,
        senderId: sarahMiller.id,
        isInternal: true,
        createdAt: daysAgo(2),
      },
    });
    await prisma.orderMessage.create({
      data: {
        content: "Update: Your order is on the truck and en route. ETA 2:00 PM. — Mike",
        orderId: order6.id,
        senderId: mikeJohnson.id,
        isInternal: false,
        createdAt: daysAgo(0),
      },
    });
    console.log("Created 4 order messages");

    // --- 15. PriceHistory ---
    console.log("\nSeeding price history...");

    const priceHistoryDefs = [
      { productId: p_mixedGreens.id, entries: [{ price: 4.49, daysAgo: 30 }, { price: 4.79, daysAgo: 15 }] },
      { productId: p_salmon.id, entries: [{ price: 13.99, daysAgo: 30 }, { price: 14.49, daysAgo: 15 }] },
      { productId: p_ribeye.id, entries: [{ price: 27.99, daysAgo: 30 }, { price: 28.49, daysAgo: 15 }] },
      { productId: p_cream.id, entries: [{ price: 5.49, daysAgo: 30 }, { price: 5.79, daysAgo: 15 }] },
      { productId: p_chicken.id, entries: [{ price: 6.49, daysAgo: 30 }, { price: 6.79, daysAgo: 15 }] },
    ];
    for (const ph of priceHistoryDefs) {
      for (const entry of ph.entries) {
        await prisma.priceHistory.create({
          data: { price: entry.price, productId: ph.productId, recordedAt: daysAgo(entry.daysAgo) },
        });
      }
    }
    console.log("Created 10 price history entries");

    // --- 16. PriceAlerts ---
    console.log("\nSeeding price alerts...");

    await prisma.priceAlert.create({
      data: {
        alertType: "PRICE_DROP" as any,
        targetPrice: 4.50,
        isActive: true,
        userId: alexChen.id,
        productId: p_mixedGreens.id,
      },
    });
    await prisma.priceAlert.create({
      data: {
        alertType: "PRICE_THRESHOLD" as any,
        targetPrice: 16.00,
        isActive: true,
        userId: alexChen.id,
        productId: p_salmon.id,
      },
    });
    console.log("Created 2 price alerts for Alex Chen");

    // --- 17. Notifications ---
    console.log("\nSeeding notifications...");

    const notifDefs = [
      { type: "ORDER_UPDATE" as any, title: "Order Confirmed", message: "Your order ORD-10004 has been confirmed by Fresh Farms Co.", createdAt: daysAgo(4) },
      { type: "PRICE_ALERT" as any, title: "Price Drop Alert", message: "Organic Mixed Greens dropped from $5.29 to $4.99 at Fresh Farms Co.", createdAt: daysAgo(3) },
      { type: "DELIVERY_UPDATE" as any, title: "Order In Transit", message: "Your order ORD-10006 is out for delivery. ETA: 2:00 PM today.", createdAt: daysAgo(0) },
      { type: "ORDER_UPDATE" as any, title: "Order Delivered", message: "Your order ORD-10007 was delivered successfully.", createdAt: daysAgo(5), isRead: true },
      { type: "SYSTEM" as any, title: "Low Inventory Alert", message: "Heavy Cream is below par level (2 of 6 quarts remaining). Consider reordering.", createdAt: daysAgo(1) },
    ];
    for (const n of notifDefs) {
      await prisma.notification.create({
        data: {
          type: n.type,
          title: n.title,
          message: n.message,
          userId: alexChen.id,
          isRead: (n as any).isRead ?? false,
          createdAt: n.createdAt,
        },
      });
    }
    console.log("Created 5 notifications for Alex Chen");

    // --- 18. Promotions ---
    console.log("\nSeeding promotions...");

    await prisma.promotion.create({
      data: {
        type: "PERCENTAGE_OFF" as any,
        value: 10,
        description: "10% off all produce items this month! Fresh seasonal savings.",
        startDate: daysAgo(15),
        endDate: daysAgo(-15),
        isActive: true,
        supplierId: freshFarms.id,
        products: {
          connect: [
            { id: p_mixedGreens.id },
            { id: p_tomatoes.id },
            { id: p_spinach.id },
          ],
        },
      },
    });
    console.log("Created active promotion: 10% off produce");

    await prisma.promotion.create({
      data: {
        type: "FREE_DELIVERY" as any,
        value: 0,
        minOrderAmount: 300,
        description: "Free delivery on orders over $300. Limited time offer!",
        startDate: daysAgo(60),
        endDate: daysAgo(30),
        isActive: false,
        supplierId: freshFarms.id,
      },
    });
    console.log("Created expired promotion: Free delivery over $300");
  } else {
    console.log(`Skipping orders/related data — ${existingOrderCount} orders already exist`);
  }

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
