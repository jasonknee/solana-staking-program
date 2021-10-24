// copyIdl.js
const fs = require('fs');
const idl = require('./target/idl/escrow.json');
console.log(idl)
fs.writeFileSync('./app/src/idl.json', JSON.stringify(idl));