const mongoose = require('mongoose');
const Service = require('./models/Service');

mongoose.connect('mongodb://localhost:27017/smartbiz', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB');
  
  const businessId = '69232857ee0ea0475e98b5bf'; // anaka business ID
  
  const services = [
    {
      tenant: businessId,
      business: businessId,
      name: 'قص شعر عادي',
      category: 'haircut',
      duration: 30,
      price: 50,
      description: 'قص شعر عادي للرجال',
      available: true,
      popularityScore: 10
    },
    {
      tenant: businessId,
      business: businessId,
      name: 'قص شعر وتشذيب لحية',
      category: 'beard',
      duration: 45,
      price: 70,
      description: 'قص شعر مع تشذيب اللحية',
      available: true,
      popularityScore: 8
    },
    {
      tenant: businessId,
      business: businessId,
      name: 'حلاقة ذقن',
      category: 'beard',
      duration: 20,
      price: 30,
      description: 'حلاقة الذقن بالموس',
      available: true,
      popularityScore: 6
    },
    {
      tenant: businessId,
      business: businessId,
      name: 'صبغة شعر',
      category: 'hair-coloring',
      duration: 60,
      price: 100,
      description: 'صبغة شعر كاملة',
      available: true,
      popularityScore: 5
    }
  ];
  
  // Delete existing services for this business
  await Service.deleteMany({ business: businessId });
  console.log('🗑️ Deleted old services');
  
  // Insert new services
  const result = await Service.insertMany(services);
  console.log(`✅ Added ${result.length} services successfully!`);
  
  // Display added services
  result.forEach((s, i) => {
    console.log(`${i+1}. ${s.name} - ${s.duration} دقيقة - ${s.price} ر.س`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
