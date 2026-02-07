const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://admin1:VxZ8mzulB9tQblgC@solarworksdb.vku9eef.mongodb.net/solarworks?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function seedDatabase() {
  try {
    await client.connect();
    const db = client.db();

    // Check if collections exist, if not create them
    const collections = await db.listCollections().toArray();
    const inventoryExists = collections.some(col => col.name === 'inventory');
    const adjustmentsExists = collections.some(col => col.name === 'stockAdjustments');

    if (!inventoryExists) {
      await db.createCollection('inventory');
      console.log('Created inventory collection');
    }
    
    if (!adjustmentsExists) {
      await db.createCollection('stockAdjustments');
      console.log('Created stockAdjustments collection');
    }

    // Create indexes
    await db.collection('inventory').createIndex({ name: 1 }, { unique: true });
    await db.collection('inventory').createIndex({ category: 1 });
    await db.collection('inventory').createIndex({ status: 1 });
    await db.collection('stockAdjustments').createIndex({ itemId: 1 });
    await db.collection('stockAdjustments').createIndex({ date: -1 });

    console.log('Indexes created');

    // Insert sample data only if inventory is empty
    const count = await db.collection('inventory').countDocuments();
    
    if (count === 0) {
      // Create ObjectId for each item
      const item1Id = new ObjectId();
      const item2Id = new ObjectId();
      const item3Id = new ObjectId();
      const item4Id = new ObjectId();
      const item5Id = new ObjectId();

      const sampleItems = [
        {
          _id: item1Id,
          name: 'Espresso Beans',
          category: 'Coffee',
          currentStock: 2,
          minStock: 10,
          maxStock: 50,
          unit: 'kg',
          status: 'critical',
          supplier: 'Coffee Beans Co.',
          lastRestocked: new Date('2024-01-15'),
          pricePerUnit: 850,
          location: 'Storage A',
          reorderPoint: 15,
          icon: 'coffee',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: item2Id,
          name: 'Fresh Milk',
          category: 'Dairy',
          currentStock: 3,
          minStock: 15,
          maxStock: 60,
          unit: 'L',
          status: 'critical',
          supplier: 'Dairy Fresh',
          lastRestocked: new Date('2024-01-18'),
          pricePerUnit: 95,
          location: 'Refrigerator 1',
          reorderPoint: 20,
          icon: 'milk',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: item3Id,
          name: 'Paper Cups (12oz)',
          category: 'Packaging',
          currentStock: 250,
          minStock: 500,
          maxStock: 2000,
          unit: 'pieces',
          status: 'warning',
          supplier: 'Eco Packaging',
          lastRestocked: new Date('2024-01-05'),
          pricePerUnit: 2.5,
          location: 'Storage B',
          reorderPoint: 750,
          icon: 'package',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: item4Id,
          name: 'Caramel Syrup',
          category: 'Syrups',
          currentStock: 15,
          minStock: 5,
          maxStock: 30,
          unit: 'bottles',
          status: 'ok',
          supplier: 'Flavor Masters',
          lastRestocked: new Date('2024-01-19'),
          pricePerUnit: 310,
          location: 'Shelf 3',
          reorderPoint: 8,
          icon: 'syrup',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: item5Id,
          name: 'White Sugar',
          category: 'Pantry',
          currentStock: 9,
          minStock: 5,
          maxStock: 25,
          unit: 'kg',
          status: 'warning',
          supplier: 'Sweet Suppliers',
          lastRestocked: new Date('2024-01-08'),
          pricePerUnit: 65,
          location: 'Storage C',
          reorderPoint: 10,
          icon: 'utensils',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const result = await db.collection('inventory').insertMany(sampleItems);
      console.log(`Inserted ${result.insertedCount} sample items`);

      // Create sample adjustments - store itemId as string
      const adjustments = [
        {
          itemId: item1Id.toString(),
          itemName: 'Espresso Beans',
          type: 'restock',
          quantity: 5,
          unit: 'kg',
          date: new Date('2024-01-15'),
          notes: 'Initial stock',
          performedBy: 'Admin',
          previousStock: 0,
          newStock: 5,
          createdAt: new Date('2024-01-15')
        },
        {
          itemId: item1Id.toString(),
          itemName: 'Espresso Beans',
          type: 'usage',
          quantity: 3,
          unit: 'kg',
          date: new Date('2024-01-20'),
          notes: 'Daily usage',
          performedBy: 'Barista',
          previousStock: 5,
          newStock: 2,
          createdAt: new Date('2024-01-20')
        }
      ];

      const adjResult = await db.collection('stockAdjustments').insertMany(adjustments);
      console.log(`Inserted ${adjResult.insertedCount} adjustments`);
    } else {
      console.log('Inventory already has data, skipping seed');
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await client.close();
  }
}

seedDatabase();