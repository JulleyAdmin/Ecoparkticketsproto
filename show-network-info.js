const os = require('os');

console.log('Network Information for LAN Testing');
console.log('===================================\n');

// Get network interfaces
const interfaces = os.networkInterfaces();
const addresses = [];

// Find all IPv4 addresses
for (const name of Object.keys(interfaces)) {
  for (const interface of interfaces[name]) {
    if (interface.family === 'IPv4' && !interface.internal) {
      addresses.push({
        name: name,
        address: interface.address,
        netmask: interface.netmask
      });
    }
  }
}

console.log('Your PC\'s Network Interfaces:');
addresses.forEach(addr => {
  console.log(`\n${addr.name}:`);
  console.log(`  IP Address: ${addr.address}`);
  console.log(`  Netmask: ${addr.netmask}`);
});

console.log('\nRecommended LAN Configuration:');
console.log('------------------------------');
console.log('Server PC: 192.168.1.100');
console.log('Controller: 192.168.1.101');
console.log('Subnet: 255.255.255.0');

console.log('\nTo start server on all interfaces:');
console.log('  npm start');

console.log('\nAccess URLs from your current IP:');
if (addresses.length > 0) {
  const primaryIP = addresses[0].address;
  console.log(`  Booking: http://${primaryIP}:3000`);
  console.log(`  Scanner: http://${primaryIP}:3000/scanner`);
  console.log(`  Admin: http://${primaryIP}:3000/admin`);
}

console.log('\nTo test with controller simulator:');
console.log('  node controller-simulator.js');