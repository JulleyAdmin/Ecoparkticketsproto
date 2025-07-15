/**
 * Controller Simulator for Testing
 * This simulates a hardware controller connected via LAN
 */

const http = require('http');

// Configuration
const SERVER_HOST = process.env.SERVER_HOST || '192.168.1.100';
const SERVER_PORT = process.env.SERVER_PORT || 3000;
const POLL_INTERVAL = 500; // milliseconds
const HEARTBEAT_INTERVAL = 5000; // milliseconds

console.log(`Controller Simulator Starting...`);
console.log(`Connecting to server at http://${SERVER_HOST}:${SERVER_PORT}`);

// Send heartbeat to server
function sendHeartbeat() {
  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/controller/heartbeat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[HEARTBEAT] Server acknowledged at ${new Date().toLocaleTimeString()}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error('[HEARTBEAT] Failed:', error.message);
  });

  req.write(JSON.stringify({}));
  req.end();
}

// Poll for gate commands
function pollCommands() {
  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/gate/commands',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const response = JSON.parse(data);
          if (response.command) {
            console.log(`[COMMAND] Received: ${response.command.action} for ticket ${response.command.ticketId}`);
            executeGateCommand(response.command);
          }
        } catch (error) {
          console.error('[POLL] Parse error:', error);
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error('[POLL] Failed:', error.message);
  });

  req.end();
}

// Execute gate command
function executeGateCommand(command) {
  console.log(`[GATE] Opening gate for ${command.duration}ms...`);
  
  // Simulate gate opening
  console.log('[GATE] >>> GATE OPENED <<<');
  
  // Acknowledge command immediately
  acknowledgeCommand(command.id, 'opened');
  
  // Simulate gate closing after duration
  setTimeout(() => {
    console.log('[GATE] >>> GATE CLOSED <<<');
  }, command.duration);
}

// Acknowledge command execution
function acknowledgeCommand(commandId, status) {
  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/gate/acknowledge',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[ACK] Command ${commandId} acknowledged`);
      }
    });
  });

  req.on('error', (error) => {
    console.error('[ACK] Failed:', error.message);
  });

  req.write(JSON.stringify({ commandId, status }));
  req.end();
}

// Start the controller simulator
console.log('[CONTROLLER] Starting operation...');

// Send initial heartbeat
sendHeartbeat();

// Start heartbeat interval
setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

// Start polling for commands
setInterval(pollCommands, POLL_INTERVAL);

console.log('[CONTROLLER] Simulator running. Press Ctrl+C to stop.');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[CONTROLLER] Shutting down...');
  process.exit(0);
});