const data = require('./minimal-prototype/public/instruments/GENMIDI.json');
data.instruments.slice(0, 4).forEach(i => {
  console.log(`Patch ${i.id}: ${i.name}, note offset: ${i.note || 'none'}`);
});
