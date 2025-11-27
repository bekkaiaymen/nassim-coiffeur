const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/smartbiz', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const Service = require('./models/Service');
  const services = await Service.find({ business: '69232857ee0ea0475e98b5bf' });
  console.log('Services found:', services.length);
  services.forEach(s => console.log('-', s.name, '| Category:', s.category));
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
