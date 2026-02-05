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

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
