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

    // ============================================================
    // SUPPLIER-SIDE EXPANDED SEED DATA
    // ============================================================

    // --- 19. Additional Supplier Users ---
    console.log("\nSeeding additional supplier users...");

    const supplierUserDefs = [
      // Ocean Harvest team
      { clerkId: "seed_supplier_admin_oh", email: "dave.nguyen@oceanharvest.com", firstName: "Dave", lastName: "Nguyen", role: "SUPPLIER_ADMIN" as any, supplierId: oceanHarvest.id },
      { clerkId: "seed_supplier_rep_oh", email: "anna.santos@oceanharvest.com", firstName: "Anna", lastName: "Santos", role: "SUPPLIER_REP" as any, supplierId: oceanHarvest.id },
      { clerkId: "seed_driver_oh", email: "brian.kelly@oceanharvest.com", firstName: "Brian", lastName: "Kelly", role: "DRIVER" as any, supplierId: oceanHarvest.id },
      // Premium Meats team
      { clerkId: "seed_supplier_admin_pm", email: "carlos.rivera@premiummeats.com", firstName: "Carlos", lastName: "Rivera", role: "SUPPLIER_ADMIN" as any, supplierId: premiumMeats.id },
      { clerkId: "seed_supplier_rep_pm", email: "diane.wu@premiummeats.com", firstName: "Diane", lastName: "Wu", role: "SUPPLIER_REP" as any, supplierId: premiumMeats.id },
      { clerkId: "seed_driver_pm", email: "frank.martinez@premiummeats.com", firstName: "Frank", lastName: "Martinez", role: "DRIVER" as any, supplierId: premiumMeats.id },
      // Dairy Direct team
      { clerkId: "seed_supplier_admin_dd", email: "grace.kim@dairydirect.com", firstName: "Grace", lastName: "Kim", role: "SUPPLIER_ADMIN" as any, supplierId: dairyDirect.id },
      { clerkId: "seed_supplier_rep_dd", email: "henry.patel@dairydirect.com", firstName: "Henry", lastName: "Patel", role: "SUPPLIER_REP" as any, supplierId: dairyDirect.id },
      // Valley Produce team
      { clerkId: "seed_supplier_admin_vp", email: "irene.cho@valleyproduce.net", firstName: "Irene", lastName: "Cho", role: "SUPPLIER_ADMIN" as any, supplierId: valleyProduce.id },
      { clerkId: "seed_supplier_rep_vp", email: "jack.thompson@valleyproduce.net", firstName: "Jack", lastName: "Thompson", role: "SUPPLIER_REP" as any, supplierId: valleyProduce.id },
    ];

    const supplierUsers: Record<string, any> = {};
    for (const u of supplierUserDefs) {
      const existing = await prisma.user.findUnique({ where: { clerkId: u.clerkId } });
      if (!existing) {
        supplierUsers[u.clerkId] = await prisma.user.create({ data: u });
        console.log(`Created supplier user: ${u.firstName} ${u.lastName}`);
      } else {
        supplierUsers[u.clerkId] = existing;
        console.log(`Supplier user already exists: ${u.clerkId}`);
      }
    }

    // --- 20. Delivery Zones for Other Suppliers ---
    console.log("\nSeeding additional delivery zones...");
    const additionalZones = [
      // Ocean Harvest
      { name: "Bay Area Waterfront", zipCodes: ["94102", "94103", "94105", "94107", "94111", "94133"], deliveryFee: 20, minimumOrder: 150, supplierId: oceanHarvest.id },
      { name: "East Bay", zipCodes: ["94601", "94602", "94607", "94608", "94609", "94612"], deliveryFee: 30, minimumOrder: 200, supplierId: oceanHarvest.id },
      { name: "South Bay", zipCodes: ["95110", "95112", "95113", "95125", "95126"], deliveryFee: 40, minimumOrder: 250, supplierId: oceanHarvest.id },
      // Premium Meats
      { name: "Central SF", zipCodes: ["94102", "94103", "94108", "94109"], deliveryFee: 25, minimumOrder: 200, supplierId: premiumMeats.id },
      { name: "Oakland/Berkeley", zipCodes: ["94601", "94602", "94607", "94703", "94704"], deliveryFee: 30, minimumOrder: 250, supplierId: premiumMeats.id },
      // Dairy Direct
      { name: "North Bay", zipCodes: ["94901", "94903", "94941", "94945"], deliveryFee: 10, minimumOrder: 50, supplierId: dairyDirect.id },
      { name: "SF Metro", zipCodes: ["94102", "94103", "94104", "94105", "94107", "94108", "94109", "94110"], deliveryFee: 15, minimumOrder: 75, supplierId: dairyDirect.id },
      // Valley Produce
      { name: "Central Valley", zipCodes: ["93701", "93702", "93706", "93710", "93711"], deliveryFee: 15, minimumOrder: 75, supplierId: valleyProduce.id },
      { name: "Bay Area Extended", zipCodes: ["94102", "94103", "94110", "94112", "94114", "94116", "94117", "94118", "94121", "94122"], deliveryFee: 25, minimumOrder: 100, supplierId: valleyProduce.id },
    ];
    for (const zone of additionalZones) {
      const existing = await prisma.deliveryZone.findFirst({
        where: { name: zone.name, supplierId: zone.supplierId },
      });
      if (!existing) {
        await prisma.deliveryZone.create({ data: zone });
        console.log(`Created delivery zone: ${zone.name}`);
      }
    }

    // --- 21. Additional RestaurantSupplier Links ---
    console.log("\nSeeding additional restaurant-supplier links...");
    const artisanBakery = await prisma.supplier.findUnique({ where: { email: "wholesale@artisanbakery.com" } });
    const globalSpice = await prisma.supplier.findUnique({ where: { email: "spices@globaltraders.com" } });
    const bayAreaBev = await prisma.supplier.findUnique({ where: { email: "orders@bayareabev.com" } });

    const additionalLinks = [
      { restaurantId: goldenFork.id, supplierId: artisanBakery!.id, isPreferred: false, notes: "Bread & pastry supplier" },
      { restaurantId: goldenFork.id, supplierId: globalSpice!.id, isPreferred: false, notes: "Spice & pantry staples" },
      { restaurantId: goldenFork.id, supplierId: bayAreaBev!.id, isPreferred: false, notes: "Beverage supplier" },
      { restaurantId: goldenFork.id, supplierId: valleyProduce.id, isPreferred: false, notes: "Backup produce" },
      { restaurantId: bistroNouveau.id, supplierId: oceanHarvest.id, isPreferred: true, notes: "Primary seafood" },
      { restaurantId: bistroNouveau.id, supplierId: dairyDirect.id, isPreferred: false, notes: "Dairy & eggs" },
      { restaurantId: bistroNouveau.id, supplierId: premiumMeats.id, isPreferred: false, notes: "Meat supplier" },
      { restaurantId: bistroNouveau.id, supplierId: artisanBakery!.id, isPreferred: true, notes: "Artisan bread for service" },
      { restaurantId: bistroNouveau.id, supplierId: globalSpice!.id, isPreferred: false },
    ];
    for (const link of additionalLinks) {
      const existing = await prisma.restaurantSupplier.findFirst({
        where: { restaurantId: link.restaurantId, supplierId: link.supplierId },
      });
      if (!existing) {
        await prisma.restaurantSupplier.create({ data: link });
        console.log(`Linked restaurant → supplier (${link.notes ?? "no notes"})`);
      }
    }

    // --- 22. Additional Orders from Bistro Nouveau (so suppliers see multiple customers) ---
    console.log("\nSeeding Bistro Nouveau orders...");

    const p_romaTomatoes = await getProduct("info@valleyproduce.net", "Roma Tomatoes");
    const p_yellowOnions = await getProduct("info@valleyproduce.net", "Yellow Onions");
    const p_celery = await getProduct("info@valleyproduce.net", "Celery");
    const p_zucchini = await getProduct("info@valleyproduce.net", "Zucchini");
    const p_sourdough = await getProduct("wholesale@artisanbakery.com", "Sourdough Bread");
    const p_baguettes = await getProduct("wholesale@artisanbakery.com", "Baguettes");
    const p_croissants = await getProduct("wholesale@artisanbakery.com", "Croissants");
    const p_coffee = await getProduct("orders@bayareabev.com", "Coffee Beans");
    const p_sparklingWater = await getProduct("orders@bayareabev.com", "Sparkling Water");
    const p_blackPepper = await getProduct("spices@globaltraders.com", "Black Pepper");
    const p_oliveOil = await getProduct("spices@globaltraders.com", "Olive Oil Extra Virgin");
    const p_balsamicVinegar = await getProduct("spices@globaltraders.com", "Balsamic Vinegar");
    const p_porkTenderloin = await getProduct("orders@premiummeats.com", "Pork Tenderloin");
    const p_lambChops = await getProduct("orders@premiummeats.com", "Lamb Chops");
    const p_duckBreast = await getProduct("orders@premiummeats.com", "Duck Breast");
    const p_wholeMilk = await getProduct("hello@dairydirect.com", "Whole Milk");
    const p_creamCheese = await getProduct("hello@dairydirect.com", "Cream Cheese");
    const p_greekYogurt = await getProduct("hello@dairydirect.com", "Greek Yogurt");
    const p_lobsterTail = await getProduct("sales@oceanharvest.com", "Lobster Tail");
    const p_seaScallops = await getProduct("sales@oceanharvest.com", "Sea Scallops");
    const p_freshTuna = await getProduct("sales@oceanharvest.com", "Fresh Tuna Steak");
    const p_mussels = await getProduct("sales@oceanharvest.com", "Mussels");

    const emmaDavis = users["seed_owner_2"];
    const jamesBrown = users["seed_manager_2"];

    const bistroOrderDefs: Array<{
      orderNumber: string; status: string; supplierId: string;
      createdById: string; deliveryDate: Date | null; deliveredAt: Date | null;
      deliveryNotes: string | null; driverId: string | null; createdAt: Date;
      items: Array<{ productId: string; quantity: number; unitPrice: number }>;
    }> = [
      {
        orderNumber: "ORD-20001", status: "DELIVERED", supplierId: freshFarms.id,
        createdById: emmaDavis.id, deliveryDate: daysAgo(10), deliveredAt: daysAgo(9),
        deliveryNotes: "Delivered — all items fresh", driverId: mikeJohnson.id, createdAt: daysAgo(12),
        items: [
          { productId: p_mixedGreens.id, quantity: 10, unitPrice: 4.99 },
          { productId: p_tomatoes.id, quantity: 8, unitPrice: 5.99 },
          { productId: p_basil.id, quantity: 4, unitPrice: 2.99 },
          { productId: p_mushrooms.id, quantity: 5, unitPrice: 5.99 },
        ],
      },
      {
        orderNumber: "ORD-20002", status: "DELIVERED", supplierId: oceanHarvest.id,
        createdById: jamesBrown.id, deliveryDate: daysAgo(8), deliveredAt: daysAgo(7),
        deliveryNotes: "Keep on ice", driverId: supplierUsers["seed_driver_oh"]?.id ?? null, createdAt: daysAgo(10),
        items: [
          { productId: p_lobsterTail.id, quantity: 6, unitPrice: 29.99 },
          { productId: p_seaScallops.id, quantity: 4, unitPrice: 22.99 },
          { productId: p_freshTuna.id, quantity: 5, unitPrice: 18.99 },
        ],
      },
      {
        orderNumber: "ORD-20003", status: "CONFIRMED", supplierId: premiumMeats.id,
        createdById: emmaDavis.id, deliveryDate: daysAgo(-1), deliveredAt: null,
        deliveryNotes: "French service cuts please", driverId: null, createdAt: daysAgo(2),
        items: [
          { productId: p_duckBreast.id, quantity: 8, unitPrice: 16.99 },
          { productId: p_lambChops.id, quantity: 6, unitPrice: 19.99 },
          { productId: p_porkTenderloin.id, quantity: 5, unitPrice: 8.99 },
        ],
      },
      {
        orderNumber: "ORD-20004", status: "PENDING", supplierId: dairyDirect.id,
        createdById: jamesBrown.id, deliveryDate: daysAgo(-2), deliveredAt: null,
        deliveryNotes: "Temperature-sensitive — morning delivery preferred", driverId: null, createdAt: daysAgo(1),
        items: [
          { productId: p_cream.id, quantity: 6, unitPrice: 5.99 },
          { productId: p_wholeMilk.id, quantity: 4, unitPrice: 4.49 },
          { productId: p_creamCheese.id, quantity: 3, unitPrice: 4.99 },
          { productId: p_greekYogurt.id, quantity: 5, unitPrice: 5.99 },
        ],
      },
      {
        orderNumber: "ORD-20005", status: "DELIVERED", supplierId: artisanBakery!.id,
        createdById: emmaDavis.id, deliveryDate: daysAgo(5), deliveredAt: daysAgo(4),
        deliveryNotes: "Leave at back door — early AM delivery", driverId: null, createdAt: daysAgo(7),
        items: [
          { productId: p_sourdough.id, quantity: 10, unitPrice: 4.99 },
          { productId: p_baguettes.id, quantity: 15, unitPrice: 3.49 },
          { productId: p_croissants.id, quantity: 3, unitPrice: 18.99 },
        ],
      },
      {
        orderNumber: "ORD-20006", status: "IN_TRANSIT", supplierId: globalSpice!.id,
        createdById: jamesBrown.id, deliveryDate: now, deliveredAt: null,
        deliveryNotes: "Pantry restock — bulk order", driverId: null, createdAt: daysAgo(3),
        items: [
          { productId: p_blackPepper.id, quantity: 2, unitPrice: 8.99 },
          { productId: p_oliveOil.id, quantity: 3, unitPrice: 14.99 },
          { productId: p_balsamicVinegar.id, quantity: 2, unitPrice: 9.99 },
        ],
      },
      {
        orderNumber: "ORD-20007", status: "PROCESSING", supplierId: bayAreaBev!.id,
        createdById: emmaDavis.id, deliveryDate: daysAgo(-1), deliveredAt: null,
        deliveryNotes: null, driverId: null, createdAt: daysAgo(2),
        items: [
          { productId: p_coffee.id, quantity: 5, unitPrice: 14.99 },
          { productId: p_sparklingWater.id, quantity: 4, unitPrice: 24.99 },
        ],
      },
      {
        orderNumber: "ORD-20008", status: "DELIVERED", supplierId: valleyProduce.id,
        createdById: jamesBrown.id, deliveryDate: daysAgo(6), deliveredAt: daysAgo(5),
        deliveryNotes: null, driverId: null, createdAt: daysAgo(8),
        items: [
          { productId: p_romaTomatoes.id, quantity: 12, unitPrice: 3.99 },
          { productId: p_yellowOnions.id, quantity: 10, unitPrice: 1.49 },
          { productId: p_celery.id, quantity: 5, unitPrice: 2.49 },
          { productId: p_zucchini.id, quantity: 8, unitPrice: 2.99 },
        ],
      },
      {
        orderNumber: "ORD-20009", status: "DELIVERED", supplierId: oceanHarvest.id,
        createdById: emmaDavis.id, deliveryDate: daysAgo(15), deliveredAt: daysAgo(14),
        deliveryNotes: "Fresh catch order — excellent quality", driverId: supplierUsers["seed_driver_oh"]?.id ?? null, createdAt: daysAgo(17),
        items: [
          { productId: p_salmon.id, quantity: 8, unitPrice: 14.99 },
          { productId: p_mussels.id, quantity: 6, unitPrice: 6.99 },
          { productId: p_cod.id, quantity: 5, unitPrice: 12.99 },
        ],
      },
      {
        orderNumber: "ORD-20010", status: "DELIVERED", supplierId: freshFarms.id,
        createdById: jamesBrown.id, deliveryDate: daysAgo(20), deliveredAt: daysAgo(19),
        deliveryNotes: null, driverId: mikeJohnson.id, createdAt: daysAgo(22),
        items: [
          { productId: p_spinach.id, quantity: 8, unitPrice: 6.99 },
          { productId: p_carrots.id, quantity: 10, unitPrice: 3.49 },
          { productId: p_tomatoes.id, quantity: 12, unitPrice: 5.99 },
        ],
      },
    ];

    for (const od of bistroOrderDefs) {
      const subtotal = od.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const tax = Math.round(subtotal * 0.0875 * 100) / 100;
      const deliveryFee = 25;
      const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

      await prisma.order.create({
        data: {
          orderNumber: od.orderNumber,
          status: od.status as any,
          subtotal, tax, deliveryFee, discount: 0, total,
          deliveryDate: od.deliveryDate,
          deliveredAt: od.deliveredAt,
          deliveryNotes: od.deliveryNotes,
          restaurantId: bistroNouveau.id,
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
      console.log(`Created Bistro order: ${od.orderNumber} (${od.status})`);
    }

    // --- 23. Invoices for Bistro Nouveau orders ---
    console.log("\nSeeding Bistro Nouveau invoices...");

    const bistroOrders = await prisma.order.findMany({
      where: { orderNumber: { in: ["ORD-20001", "ORD-20002", "ORD-20005", "ORD-20008", "ORD-20009", "ORD-20010"] } },
    });

    const bistroInvoiceDefs = [
      { orderNumber: "ORD-20001", invoiceNumber: "INV-20010", status: "PAID" as const, paidAt: daysAgo(7), paymentMethod: "CREDIT_CARD" as const, paymentReference: "TXN-FF-20001" },
      { orderNumber: "ORD-20002", invoiceNumber: "INV-20011", status: "PAID" as const, paidAt: daysAgo(5), paymentMethod: "BANK_TRANSFER" as const, paymentReference: "TXN-OH-20002" },
      { orderNumber: "ORD-20005", invoiceNumber: "INV-20012", status: "PENDING" as const, paidAt: null, paymentMethod: null, paymentReference: null },
      { orderNumber: "ORD-20008", invoiceNumber: "INV-20013", status: "PAID" as const, paidAt: daysAgo(3), paymentMethod: "BANK_TRANSFER" as const, paymentReference: "TXN-VP-20008" },
      { orderNumber: "ORD-20009", invoiceNumber: "INV-20014", status: "PAID" as const, paidAt: daysAgo(12), paymentMethod: "CREDIT_CARD" as const, paymentReference: "TXN-OH-20009" },
      { orderNumber: "ORD-20010", invoiceNumber: "INV-20015", status: "OVERDUE" as const, paidAt: null, paymentMethod: null, paymentReference: null },
    ];

    for (const inv of bistroInvoiceDefs) {
      const order = bistroOrders.find((o) => o.orderNumber === inv.orderNumber);
      if (!order) continue;
      const existing = await prisma.invoice.findFirst({ where: { invoiceNumber: inv.invoiceNumber } });
      if (!existing) {
        await prisma.invoice.create({
          data: {
            invoiceNumber: inv.invoiceNumber,
            status: inv.status as any,
            subtotal: Number(order.subtotal),
            tax: Number(order.tax),
            total: Number(order.total),
            dueDate: inv.status === "OVERDUE" ? daysAgo(5) : daysAgo(-14),
            paidAt: inv.paidAt,
            paidAmount: inv.paidAt ? Number(order.total) : null,
            paymentMethod: inv.paymentMethod as any,
            paymentReference: inv.paymentReference,
            restaurantId: bistroNouveau.id,
            supplierId: order.supplierId,
            orderId: order.id,
          },
        });
        console.log(`Created invoice: ${inv.invoiceNumber} (${inv.status})`);
      }
    }

    // --- 24. Supplier Insights ---
    console.log("\nSeeding supplier insights...");

    const insightDefs = [
      // Fresh Farms insights
      {
        supplierId: freshFarms.id, type: "DEMAND_FORECAST", title: "Produce demand surge expected",
        summary: "Based on historical ordering patterns, demand for leafy greens and tomatoes typically increases 25-30% in the next 2 weeks as restaurants update spring menus. Consider increasing stock levels for Mixed Greens, Baby Spinach, and Heirloom Tomatoes.",
        data: { products: ["Organic Mixed Greens", "Baby Spinach", "Heirloom Tomatoes"], expectedIncrease: "25-30%", timeframe: "2 weeks", confidence: 0.85 },
        status: "ACTIVE",
      },
      {
        supplierId: freshFarms.id, type: "CUSTOMER_HEALTH", title: "Bistro Nouveau order frequency declining",
        summary: "Bistro Nouveau has reduced order frequency from weekly to bi-weekly over the past month. Their last order was 10 days ago compared to their usual 7-day cycle. Consider reaching out to check on their satisfaction.",
        data: { restaurant: "Bistro Nouveau", previousCadence: "7 days", currentCadence: "14 days", riskLevel: "MEDIUM", lastOrderDaysAgo: 10 },
        status: "ACTIVE",
      },
      {
        supplierId: freshFarms.id, type: "PRICING_SUGGESTION", title: "Competitive pricing opportunity on mushrooms",
        summary: "Your Mushrooms are priced at $5.99/lb while the market average is $5.49/lb. A 5% price reduction could increase order volume by an estimated 15% based on price elasticity analysis of similar products.",
        data: { product: "Mushrooms", currentPrice: 5.99, marketAvg: 5.49, suggestedPrice: 5.69, estimatedVolumeIncrease: "15%" },
        status: "ACTIVE",
      },
      // Ocean Harvest insights
      {
        supplierId: oceanHarvest.id, type: "DEMAND_FORECAST", title: "Weekend seafood demand peak",
        summary: "Friday and Saturday orders historically account for 60% of weekly seafood volume. Salmon and Shrimp are the top sellers. Recommend pre-staging inventory for Thursday dispatch.",
        data: { peakDays: ["Friday", "Saturday"], topProducts: ["Atlantic Salmon Fillet", "Jumbo Shrimp"], weekendShare: "60%", recommendation: "Pre-stage Thursday" },
        status: "ACTIVE",
      },
      {
        supplierId: oceanHarvest.id, type: "ANOMALY", title: "Unusual spike in lobster orders",
        summary: "Lobster Tail orders jumped 150% this week compared to the 4-week average. This may be driven by seasonal menu changes at multiple restaurants. Monitor stock levels closely.",
        data: { product: "Lobster Tail", increase: "150%", period: "this week vs 4-week avg", possibleCause: "seasonal menus" },
        status: "ACTIVE",
      },
      // Premium Meats insights
      {
        supplierId: premiumMeats.id, type: "PRICING_SUGGESTION", title: "Premium cut bundling opportunity",
        summary: "Restaurants that order Ribeye frequently also order Filet Mignon 78% of the time. Consider a premium steak bundle at a 5% discount to increase average order value.",
        data: { products: ["USDA Prime Ribeye", "Filet Mignon"], correlation: 0.78, suggestedDiscount: "5%", estimatedAOVIncrease: "12%" },
        status: "ACTIVE",
      },
      {
        supplierId: premiumMeats.id, type: "CUSTOMER_HEALTH", title: "Golden Fork is a top customer at risk",
        summary: "The Golden Fork has a pending order (ORD-10002) awaiting approval for 2 days. Their typical approval cycle is under 24 hours. This may indicate budget concerns or process changes.",
        data: { restaurant: "The Golden Fork", pendingOrder: "ORD-10002", daysPending: 2, normalApprovalTime: "< 24 hours", riskLevel: "LOW" },
        status: "ACTIVE",
      },
      // Dairy Direct insights
      {
        supplierId: dairyDirect.id, type: "DEMAND_FORECAST", title: "Brunch season approaching",
        summary: "Egg and cream orders typically increase 40% during spring brunch season (April-May). Current stock levels may be insufficient. Recommend increasing inventory of Eggs, Heavy Cream, and Greek Yogurt.",
        data: { season: "Spring brunch", expectedIncrease: "40%", products: ["Eggs", "Heavy Cream", "Greek Yogurt"], timeframe: "April-May" },
        status: "ACTIVE",
      },
      {
        supplierId: dairyDirect.id, type: "ESCALATION", title: "Pending order requires attention",
        summary: "Order ORD-20004 from Bistro Nouveau has been in PENDING status for over 24 hours. The requested delivery date is approaching. Confirm or process the order promptly to meet the delivery window.",
        data: { order: "ORD-20004", restaurant: "Bistro Nouveau", hoursPending: 28, deliveryDateApproaching: true },
        status: "ACTIVE",
      },
      // Valley Produce insights
      {
        supplierId: valleyProduce.id, type: "PRICING_SUGGESTION", title: "Roma Tomatoes underpriced vs market",
        summary: "Your Roma Tomatoes at $3.99/lb are 12% below market average ($4.49/lb). You can increase margin without impacting demand given your quality reputation and reliable delivery.",
        data: { product: "Roma Tomatoes", currentPrice: 3.99, marketAvg: 4.49, suggestedPrice: 4.29, marginImprovement: "7.5%" },
        status: "ACTIVE",
      },
    ];

    for (const insight of insightDefs) {
      const existing = await prisma.supplierInsight.findFirst({
        where: { supplierId: insight.supplierId, title: insight.title },
      });
      if (!existing) {
        await prisma.supplierInsight.create({
          data: {
            ...insight,
            data: insight.data as any,
            createdAt: daysAgo(Math.floor(Math.random() * 5)),
            expiresAt: daysAgo(-14),
          },
        });
        console.log(`Created insight: ${insight.title}`);
      }
    }

    // --- 25. Additional Promotions ---
    console.log("\nSeeding additional promotions...");

    await prisma.promotion.create({
      data: {
        type: "PERCENTAGE_OFF" as any,
        value: 15,
        description: "15% off premium seafood! Fresh catch season special — Salmon, Tuna & Scallops.",
        startDate: daysAgo(7),
        endDate: daysAgo(-23),
        isActive: true,
        supplierId: oceanHarvest.id,
        products: {
          connect: [
            { id: p_salmon.id },
            { id: p_freshTuna.id },
            { id: p_seaScallops.id },
          ],
        },
      },
    });
    console.log("Created Ocean Harvest promotion: 15% off premium seafood");

    await prisma.promotion.create({
      data: {
        type: "BUY_X_GET_Y" as any,
        value: 0,
        buyQuantity: 10,
        getQuantity: 2,
        description: "Buy 10 lbs of any steak cut, get 2 lbs free! Limited time offer.",
        startDate: daysAgo(5),
        endDate: daysAgo(-25),
        isActive: true,
        supplierId: premiumMeats.id,
        products: {
          connect: [
            { id: p_ribeye.id },
            { id: p_filet.id },
          ],
        },
      },
    });
    console.log("Created Premium Meats promotion: Buy 10 get 2 free");

    await prisma.promotion.create({
      data: {
        type: "FREE_DELIVERY" as any,
        value: 0,
        minOrderAmount: 200,
        description: "Free delivery on dairy orders over $200. Farm-fresh, delivered free!",
        startDate: daysAgo(10),
        endDate: daysAgo(-20),
        isActive: true,
        supplierId: dairyDirect.id,
      },
    });
    console.log("Created Dairy Direct promotion: Free delivery over $200");

    await prisma.promotion.create({
      data: {
        type: "FLAT_DISCOUNT" as any,
        value: 5,
        minOrderAmount: 100,
        description: "$5 off your next bakery order of $100+. Fresh-baked daily!",
        startDate: daysAgo(3),
        endDate: daysAgo(-27),
        isActive: true,
        supplierId: artisanBakery!.id,
      },
    });
    console.log("Created Artisan Bakery promotion: $5 off $100+");

    await prisma.promotion.create({
      data: {
        type: "PERCENTAGE_OFF" as any,
        value: 20,
        description: "20% off all spices and seasonings — stock up for the new menu season!",
        startDate: daysAgo(30),
        endDate: daysAgo(5),
        isActive: false,
        supplierId: globalSpice!.id,
      },
    });
    console.log("Created expired Global Spice promotion: 20% off spices");

    // --- 26. Supplier Notifications ---
    console.log("\nSeeding supplier notifications...");

    const supplierNotifDefs = [
      // Fresh Farms notifications
      { type: "ORDER_UPDATE" as any, title: "New Order Received", message: "The Golden Fork placed order ORD-10001 ($192.12). Review and confirm.", userId: tomWilson.id, createdAt: daysAgo(1) },
      { type: "ORDER_UPDATE" as any, title: "Order Delivered", message: "Order ORD-10007 was delivered successfully to The Golden Fork.", userId: tomWilson.id, createdAt: daysAgo(5), isRead: true },
      { type: "SYSTEM" as any, title: "New Customer", message: "Bistro Nouveau has been linked as a new customer.", userId: tomWilson.id, createdAt: daysAgo(12), isRead: true },
      { type: "ORDER_UPDATE" as any, title: "Return Request Filed", message: "The Golden Fork filed return request RET-30001 for Organic Mixed Greens on order ORD-10007.", userId: tomWilson.id, createdAt: daysAgo(4) },
      { type: "PRICE_ALERT" as any, title: "Insight: Demand Forecast", message: "AI predicts a 25-30% demand surge for leafy greens in the next 2 weeks. Review your stock levels.", userId: tomWilson.id, createdAt: daysAgo(2) },
      // Ocean Harvest notifications
      { type: "ORDER_UPDATE" as any, title: "New Order Received", message: "The Golden Fork placed order ORD-10003 ($284.85). Pending confirmation.", userId: supplierUsers["seed_supplier_admin_oh"].id, createdAt: daysAgo(3) },
      { type: "ORDER_UPDATE" as any, title: "Large Order Alert", message: "Bistro Nouveau ordered $371.85 of premium seafood (ORD-20002). Lobster tails and scallops in high demand.", userId: supplierUsers["seed_supplier_admin_oh"].id, createdAt: daysAgo(10) },
      { type: "SYSTEM" as any, title: "Promotion Live", message: "Your '15% off premium seafood' promotion is now active. 3 products included.", userId: supplierUsers["seed_supplier_admin_oh"].id, createdAt: daysAgo(7), isRead: true },
      // Premium Meats notifications
      { type: "ORDER_UPDATE" as any, title: "Order Awaiting Approval", message: "Order ORD-10002 ($594.82) from The Golden Fork is awaiting approval — large meat order.", userId: supplierUsers["seed_supplier_admin_pm"].id, createdAt: daysAgo(2) },
      { type: "ORDER_UPDATE" as any, title: "New Order from Bistro Nouveau", message: "Bistro Nouveau placed order ORD-20003 — duck breast, lamb chops, pork tenderloin.", userId: supplierUsers["seed_supplier_admin_pm"].id, createdAt: daysAgo(2) },
      { type: "DELIVERY_UPDATE" as any, title: "Return Resolved", message: "Return RET-30002 has been resolved. $34.95 credit issued to The Golden Fork.", userId: supplierUsers["seed_supplier_admin_pm"].id, createdAt: daysAgo(8), isRead: true },
      // Dairy Direct notifications
      { type: "ORDER_UPDATE" as any, title: "New Order Received", message: "Bistro Nouveau placed order ORD-20004 for dairy products. Review and confirm.", userId: supplierUsers["seed_supplier_admin_dd"].id, createdAt: daysAgo(1) },
      { type: "PRICE_ALERT" as any, title: "Brunch Season Alert", message: "AI forecasts 40% increase in egg and cream demand for spring brunch season. Prepare inventory.", userId: supplierUsers["seed_supplier_admin_dd"].id, createdAt: daysAgo(3) },
      // Valley Produce notifications
      { type: "ORDER_UPDATE" as any, title: "Order Delivered", message: "Order ORD-20008 delivered to Bistro Nouveau. All items accepted.", userId: supplierUsers["seed_supplier_admin_vp"].id, createdAt: daysAgo(5), isRead: true },
      { type: "PRICE_ALERT" as any, title: "Pricing Opportunity", message: "AI analysis suggests Roma Tomatoes can be priced 7% higher without impacting demand.", userId: supplierUsers["seed_supplier_admin_vp"].id, createdAt: daysAgo(2) },
    ];

    for (const n of supplierNotifDefs) {
      await prisma.notification.create({
        data: {
          type: n.type,
          title: n.title,
          message: n.message,
          userId: n.userId,
          isRead: (n as any).isRead ?? false,
          createdAt: n.createdAt,
        },
      });
    }
    console.log(`Created ${supplierNotifDefs.length} supplier notifications`);

    // --- 27. Additional Price History (more suppliers) ---
    console.log("\nSeeding additional price history...");

    const additionalPriceHistory = [
      { productId: p_lobsterTail.id, entries: [{ price: 27.99, daysAgo: 60 }, { price: 28.99, daysAgo: 30 }, { price: 29.99, daysAgo: 7 }] },
      { productId: p_seaScallops.id, entries: [{ price: 21.99, daysAgo: 30 }, { price: 22.49, daysAgo: 15 }] },
      { productId: p_duckBreast.id, entries: [{ price: 15.99, daysAgo: 45 }, { price: 16.49, daysAgo: 20 }, { price: 16.99, daysAgo: 5 }] },
      { productId: p_lambChops.id, entries: [{ price: 18.99, daysAgo: 30 }, { price: 19.49, daysAgo: 15 }] },
      { productId: p_butter.id, entries: [{ price: 6.49, daysAgo: 45 }, { price: 6.79, daysAgo: 20 }] },
      { productId: p_eggs.id, entries: [{ price: 3.99, daysAgo: 60 }, { price: 4.49, daysAgo: 30 }, { price: 4.79, daysAgo: 10 }] },
      { productId: p_romaTomatoes.id, entries: [{ price: 3.49, daysAgo: 30 }, { price: 3.79, daysAgo: 15 }] },
      { productId: p_oliveOil.id, entries: [{ price: 12.99, daysAgo: 60 }, { price: 13.99, daysAgo: 30 }, { price: 14.49, daysAgo: 10 }] },
      { productId: p_coffee.id, entries: [{ price: 13.99, daysAgo: 30 }, { price: 14.49, daysAgo: 15 }] },
    ];
    for (const ph of additionalPriceHistory) {
      for (const entry of ph.entries) {
        await prisma.priceHistory.create({
          data: { price: entry.price, productId: ph.productId, recordedAt: daysAgo(entry.daysAgo) },
        });
      }
    }
    console.log("Created additional price history entries");

    // --- 28. Stock Quantity Updates (some products low/out of stock) ---
    console.log("\nSeeding product stock quantities...");

    const stockUpdates = [
      { email: "orders@freshfarms.co", name: "Fresh Basil", stockQuantity: 12, reorderPoint: 20 },
      { email: "orders@freshfarms.co", name: "Asparagus", stockQuantity: 5, reorderPoint: 15 },
      { email: "orders@freshfarms.co", name: "Organic Mixed Greens", stockQuantity: 45, reorderPoint: 30 },
      { email: "orders@freshfarms.co", name: "Mushrooms", stockQuantity: 8, reorderPoint: 15 },
      { email: "sales@oceanharvest.com", name: "Lobster Tail", stockQuantity: 0, reorderPoint: 10, inStock: false },
      { email: "sales@oceanharvest.com", name: "Sea Scallops", stockQuantity: 4, reorderPoint: 8 },
      { email: "sales@oceanharvest.com", name: "Atlantic Salmon Fillet", stockQuantity: 35, reorderPoint: 20 },
      { email: "orders@premiummeats.com", name: "Duck Breast", stockQuantity: 3, reorderPoint: 10 },
      { email: "orders@premiummeats.com", name: "USDA Prime Ribeye", stockQuantity: 25, reorderPoint: 15 },
      { email: "orders@premiummeats.com", name: "Filet Mignon", stockQuantity: 18, reorderPoint: 12 },
      { email: "hello@dairydirect.com", name: "Eggs", stockQuantity: 60, reorderPoint: 40 },
      { email: "hello@dairydirect.com", name: "Heavy Cream", stockQuantity: 22, reorderPoint: 15 },
      { email: "hello@dairydirect.com", name: "Greek Yogurt", stockQuantity: 0, reorderPoint: 10, inStock: false },
      { email: "info@valleyproduce.net", name: "Roma Tomatoes", stockQuantity: 50, reorderPoint: 30 },
      { email: "wholesale@artisanbakery.com", name: "Croissants", stockQuantity: 6, reorderPoint: 12 },
      { email: "spices@globaltraders.com", name: "Olive Oil Extra Virgin", stockQuantity: 15, reorderPoint: 10 },
      { email: "orders@bayareabev.com", name: "Coffee Beans", stockQuantity: 20, reorderPoint: 15 },
    ];

    for (const su of stockUpdates) {
      const product = await findProduct(su.email, su.name);
      if (product) {
        await prisma.supplierProduct.update({
          where: { id: product.id },
          data: {
            stockQuantity: su.stockQuantity,
            reorderPoint: su.reorderPoint,
            inStock: (su as any).inStock ?? true,
          },
        });
      }
    }
    console.log(`Updated stock quantities for ${stockUpdates.length} products`);

    // --- 29. AI Usage Logs (supplier side) ---
    console.log("\nSeeding supplier AI usage logs...");

    const aiUsageDefs = [
      { feature: "SUPPLIER_CHAT" as any, supplierId: freshFarms.id, inputTokens: 1250, outputTokens: 890, model: "claude-sonnet-4-5-20250514", durationMs: 2100, periodStart: daysAgo(1) },
      { feature: "SUPPLIER_DIGEST" as any, supplierId: freshFarms.id, inputTokens: 3200, outputTokens: 1800, model: "claude-sonnet-4-5-20250514", durationMs: 4500, periodStart: daysAgo(7) },
      { feature: "SUPPLIER_CHAT" as any, supplierId: freshFarms.id, inputTokens: 980, outputTokens: 650, model: "claude-sonnet-4-5-20250514", durationMs: 1800, periodStart: daysAgo(3) },
      { feature: "SUPPLIER_CHAT" as any, supplierId: oceanHarvest.id, inputTokens: 1100, outputTokens: 780, model: "claude-sonnet-4-5-20250514", durationMs: 1950, periodStart: daysAgo(2) },
      { feature: "SUPPLIER_DIGEST" as any, supplierId: oceanHarvest.id, inputTokens: 2800, outputTokens: 1500, model: "claude-sonnet-4-5-20250514", durationMs: 3800, periodStart: daysAgo(7) },
      { feature: "SUPPLIER_CHAT" as any, supplierId: premiumMeats.id, inputTokens: 1500, outputTokens: 920, model: "claude-sonnet-4-5-20250514", durationMs: 2300, periodStart: daysAgo(1) },
      { feature: "SUPPLIER_CHAT" as any, supplierId: dairyDirect.id, inputTokens: 850, outputTokens: 520, model: "claude-sonnet-4-5-20250514", durationMs: 1500, periodStart: daysAgo(4) },
    ];

    for (const log of aiUsageDefs) {
      await prisma.aiUsageLog.create({ data: log });
    }
    console.log(`Created ${aiUsageDefs.length} AI usage logs for suppliers`);

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
