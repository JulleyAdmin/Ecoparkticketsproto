# LAN Controller Testing Guide

This guide explains how to test the QR ticketing system with a controller connected via LAN.

## System Architecture

```
[Your PC] <--Ethernet--> [Controller] --> [Gate/Turnstile]
    |
    |---> Server (Port 3000)
    |---> Browser (Scanner/Admin)
```

## Step 1: Network Configuration

### Configure Your PC's Ethernet Connection

**Windows:**
1. Control Panel → Network and Sharing Center
2. Change adapter settings
3. Right-click Ethernet → Properties
4. Internet Protocol Version 4 → Properties
5. Set:
   - IP Address: 192.168.1.100
   - Subnet Mask: 255.255.255.0
   - Leave Gateway blank

**Mac/Linux:**
1. System Preferences → Network (Mac) or Network Settings (Linux)
2. Select Ethernet connection
3. Configure IPv4: Manually
4. Set:
   - IP: 192.168.1.100
   - Subnet: 255.255.255.0

### Configure Controller Network
Set your controller to:
- IP: 192.168.1.101
- Subnet: 255.255.255.0
- No gateway needed

## Step 2: Start the Server

```bash
cd prototype
npm start
```

The server will start on all network interfaces (0.0.0.0:3000).

## Step 3: Test Network Connectivity

From your PC, test the connection:
```bash
# Test if controller is reachable
ping 192.168.1.101

# Test server from another device
curl http://192.168.1.100:3000/api/controller/status
```

## Step 4: Controller Simulator Testing

If you don't have a physical controller ready, use the simulator:

```bash
# In a new terminal
cd prototype
SERVER_HOST=localhost node controller-simulator.js
```

For LAN testing with the simulator on another machine:
```bash
SERVER_HOST=192.168.1.100 node controller-simulator.js
```

## Step 5: Access the System

### From Your PC (Server Machine):
- Booking Portal: http://localhost:3000
- QR Scanner: http://localhost:3000/scanner
- Admin Dashboard: http://localhost:3000/admin

### From Other Devices on LAN:
- Booking Portal: http://192.168.1.100:3000
- QR Scanner: http://192.168.1.100:3000/scanner
- Admin Dashboard: http://192.168.1.100:3000/admin

## Step 6: Testing Workflow

### 1. Monitor Controller Status
1. Open Admin Dashboard: http://192.168.1.100:3000/admin
2. Verify controller shows as "ONLINE"
3. Check last heartbeat time updates every 5 seconds

### 2. Create a Test Ticket
1. Go to booking portal
2. Fill in details:
   - Name: Test User
   - Phone: 9999999999
   - Date: Today
   - Adults: 1
3. Generate ticket and save QR code

### 3. Test QR Validation
1. Open scanner on mobile/tablet: http://192.168.1.100:3000/scanner
2. Click "Start Scanning"
3. Scan the QR code
4. Observe:
   - Scanner shows "VALID"
   - Admin dashboard shows pending command
   - Controller simulator shows gate opening
   - Command gets acknowledged

### 4. Test Manual Entry
1. On scanner page, enter ticket ID manually
2. Click "Validate"
3. Same flow should occur

## Controller API Testing

### Test Individual Endpoints:

```bash
# Check controller status
curl http://192.168.1.100:3000/api/controller/status

# Send heartbeat (from controller)
curl -X POST http://192.168.1.100:3000/api/controller/heartbeat

# Poll for commands (from controller)
curl http://192.168.1.100:3000/api/gate/commands

# Acknowledge command (from controller)
curl -X POST http://192.168.1.100:3000/api/gate/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"commandId":"xxx","status":"opened"}'
```

## Real Controller Implementation

For your actual controller, implement this logic:

```python
# Pseudo-code for controller
import requests
import time
import RPi.GPIO as GPIO  # For Raspberry Pi

GATE_PIN = 17
SERVER = "http://192.168.1.100:3000"

# Setup
GPIO.setmode(GPIO.BCM)
GPIO.setup(GATE_PIN, GPIO.OUT)

# Main loop
while True:
    try:
        # Poll for commands
        response = requests.get(f"{SERVER}/api/gate/commands")
        data = response.json()
        
        if data['command']:
            cmd = data['command']
            print(f"Opening gate for ticket {cmd['ticketId']}")
            
            # Open gate
            GPIO.output(GATE_PIN, GPIO.HIGH)
            time.sleep(cmd['duration'] / 1000)
            GPIO.output(GATE_PIN, GPIO.LOW)
            
            # Acknowledge
            requests.post(f"{SERVER}/api/gate/acknowledge", 
                json={"commandId": cmd['id'], "status": "opened"})
    
    except Exception as e:
        print(f"Error: {e}")
    
    time.sleep(0.5)  # Poll every 500ms
```

## Troubleshooting

### Controller Shows Offline
- Check network cable connection
- Verify IP configuration on both devices
- Test ping between devices
- Check firewall settings

### Commands Not Received
- Verify server is running on 0.0.0.0 (not localhost)
- Check controller is polling the correct endpoint
- Look at server console for errors
- Verify QR validation is creating commands

### Scanner Not Working
- Ensure HTTPS or localhost access
- Check camera permissions
- Try manual ticket ID entry
- Verify server is accessible from device

## Test Scenarios

1. **Valid Ticket** → Gate opens for 5 seconds
2. **Invalid QR** → No gate command sent
3. **Already Used Ticket** → Shows invalid, no gate command
4. **Wrong Date** → Shows invalid for different date
5. **Network Interruption** → System recovers when connection restored
6. **Multiple Rapid Scans** → Commands queue properly

## Monitoring

The Admin Dashboard (http://192.168.1.100:3000/admin) shows:
- Controller online/offline status
- Pending gate commands
- Recent command history
- Today's ticket statistics
- Last heartbeat time

## Security Notes

1. This prototype uses HTTP - production should use HTTPS
2. Add authentication to admin endpoints
3. Implement IP whitelisting for controllers
4. Use environment variables for sensitive configuration
5. Add rate limiting to prevent abuse