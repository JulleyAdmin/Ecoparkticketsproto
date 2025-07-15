const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { generateTicketQR, validateQRData } = require('./utils/qr-utils');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;

// Gate command queue
const gateCommands = [];
const controllerStatus = {
  lastHeartbeat: null,
  isOnline: false,
  ip: null
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database path
const DB_PATH = path.join(__dirname, 'data', 'tickets.json');

// Database helper functions
const db = {
  async read() {
    try {
      const data = await fs.readFile(DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { tickets: [] };
    }
  },
  
  async write(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  },
  
  async addTicket(ticket) {
    const data = await this.read();
    data.tickets.push(ticket);
    await this.write(data);
    return ticket;
  },
  
  async findTicket(id) {
    const data = await this.read();
    return data.tickets.find(t => t.id === id);
  },
  
  async updateTicket(id, updates) {
    const data = await this.read();
    const index = data.tickets.findIndex(t => t.id === id);
    if (index !== -1) {
      data.tickets[index] = { ...data.tickets[index], ...updates };
      await this.write(data);
      return data.tickets[index];
    }
    return null;
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/scanner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scanner.html'));
});

app.get('/ticket/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ticket.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Routes

// Create a new ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const { visitorName, phone, visitDate, ticketType, adultCount, childCount } = req.body;
    
    // Validate input
    if (!visitorName || !phone || !visitDate || !ticketType || !adultCount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate ticket ID
    const ticketId = `PKT-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Calculate total amount
    const totalAmount = (adultCount * 50) + (childCount * 25);
    
    // Create ticket object
    const ticket = {
      id: ticketId,
      visitorName,
      phone,
      visitDate,
      ticketType,
      adultCount,
      childCount,
      totalAmount,
      createdAt: new Date().toISOString(),
      status: 'active',
      usedAt: null
    };
    
    // Generate QR code
    const qrCode = await generateTicketQR(ticket);
    ticket.qrCode = qrCode;
    
    // Save to database
    await db.addTicket(ticket);
    
    res.json({
      success: true,
      ticket,
      qrCode
    });
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Get ticket details
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await db.findTicket(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json({ ticket });
    
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Validate QR code
app.post('/api/validate', async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({ error: 'No QR data provided' });
    }
    
    // Validate QR data format and signature
    const validation = validateQRData(qrData);
    
    if (!validation.valid) {
      return res.json({
        valid: false,
        message: validation.error
      });
    }
    
    // Find ticket in database
    const ticket = await db.findTicket(validation.data.id);
    
    if (!ticket) {
      return res.json({
        valid: false,
        message: 'Ticket not found'
      });
    }
    
    // Check if ticket is already used (for single entry tickets)
    if (ticket.ticketType === 'single' && ticket.status === 'used') {
      return res.json({
        valid: false,
        message: 'Ticket already used',
        ticket
      });
    }
    
    // Check if visit date matches
    const today = new Date().toISOString().split('T')[0];
    if (ticket.visitDate !== today) {
      return res.json({
        valid: false,
        message: `Ticket is valid for ${ticket.visitDate} only`,
        ticket
      });
    }
    
    // Mark single entry ticket as used
    if (ticket.ticketType === 'single') {
      await db.updateTicket(ticket.id, { 
        status: 'used',
        usedAt: new Date().toISOString()
      });
    }
    
    // Add gate command to queue
    const gateCommand = {
      id: uuidv4(),
      ticketId: ticket.id,
      action: 'open',
      duration: 5000,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    gateCommands.push(gateCommand);
    console.log(`Gate command queued for ticket ${ticket.id}`);
    
    res.json({
      valid: true,
      message: 'Valid ticket - Allow entry',
      ticket,
      gateCommandId: gateCommand.id
    });
    
  } catch (error) {
    console.error('Error validating ticket:', error);
    res.status(500).json({ error: 'Failed to validate ticket' });
  }
});

// Controller API Routes

// Controller status endpoint
app.get('/api/controller/status', (req, res) => {
  const isOnline = controllerStatus.lastHeartbeat && 
    (Date.now() - new Date(controllerStatus.lastHeartbeat).getTime() < 10000);
  
  res.json({
    online: isOnline,
    lastHeartbeat: controllerStatus.lastHeartbeat,
    ip: controllerStatus.ip,
    pendingCommands: gateCommands.filter(cmd => !cmd.acknowledged).length
  });
});

// Controller heartbeat
app.post('/api/controller/heartbeat', (req, res) => {
  controllerStatus.lastHeartbeat = new Date().toISOString();
  controllerStatus.isOnline = true;
  controllerStatus.ip = req.ip;
  
  console.log(`Controller heartbeat received from ${req.ip}`);
  
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString()
  });
});

// Get pending gate commands
app.get('/api/gate/commands', (req, res) => {
  // Get the oldest unacknowledged command
  const pendingCommand = gateCommands.find(cmd => !cmd.acknowledged);
  
  if (pendingCommand) {
    res.json({
      command: pendingCommand,
      hasMore: gateCommands.filter(cmd => !cmd.acknowledged).length > 1
    });
  } else {
    res.json({
      command: null,
      hasMore: false
    });
  }
});

// Acknowledge gate command
app.post('/api/gate/acknowledge', (req, res) => {
  const { commandId, status } = req.body;
  
  const commandIndex = gateCommands.findIndex(cmd => cmd.id === commandId);
  
  if (commandIndex !== -1) {
    gateCommands[commandIndex].acknowledged = true;
    gateCommands[commandIndex].acknowledgedAt = new Date().toISOString();
    gateCommands[commandIndex].executionStatus = status;
    
    console.log(`Gate command ${commandId} acknowledged with status: ${status}`);
    
    // Clean up old acknowledged commands (keep last 100)
    const acknowledgedCommands = gateCommands.filter(cmd => cmd.acknowledged);
    if (acknowledgedCommands.length > 100) {
      const toRemove = acknowledgedCommands.slice(0, acknowledgedCommands.length - 100);
      toRemove.forEach(cmd => {
        const idx = gateCommands.indexOf(cmd);
        if (idx > -1) gateCommands.splice(idx, 1);
      });
    }
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Command not found' });
  }
});

// Admin dashboard endpoint
app.get('/admin/dashboard', async (req, res) => {
  const data = await db.read();
  const todayTickets = data.tickets.filter(t => 
    t.visitDate === new Date().toISOString().split('T')[0]
  );
  
  const isControllerOnline = controllerStatus.lastHeartbeat && 
    (Date.now() - new Date(controllerStatus.lastHeartbeat).getTime() < 10000);
  
  res.json({
    controller: {
      status: isControllerOnline ? 'online' : 'offline',
      lastHeartbeat: controllerStatus.lastHeartbeat,
      ip: controllerStatus.ip
    },
    gateCommands: {
      pending: gateCommands.filter(cmd => !cmd.acknowledged),
      recent: gateCommands.slice(-10).reverse()
    },
    todayStats: {
      totalTickets: todayTickets.length,
      usedTickets: todayTickets.filter(t => t.status === 'used').length,
      revenue: todayTickets.reduce((sum, t) => sum + t.totalAmount, 0)
    }
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`Scanner available at http://${HOST}:${PORT}/scanner`);
  console.log(`Controller endpoints ready for LAN connections`);
});