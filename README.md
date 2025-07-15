# Hyderabad Parks QR Ticketing Prototype

A quick prototype demonstrating QR code-based ticketing system for park entry management.

## Features

- **Ticket Booking**: Create tickets with visitor information
- **QR Code Generation**: Secure QR codes with HMAC signatures
- **QR Code Scanning**: Web-based scanner for ticket validation
- **File-based Database**: Simple JSON storage (no database setup required)
- **Validation Logic**: Check ticket validity, prevent duplicate entries
- **Mobile Responsive**: Works on desktop and mobile devices

## Quick Start

1. Navigate to the prototype directory:
   ```bash
   cd prototype
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser:
   - Booking Portal: http://localhost:3000
   - QR Scanner: http://localhost:3000/scanner

## How to Use

### Booking a Ticket:
1. Fill in visitor details (name, phone, date)
2. Select ticket type (Single Entry or Daily Pass)
3. Enter number of adults and children
4. Click "Generate Ticket"
5. Save or print the generated QR code

### Validating Tickets:
1. Go to the scanner page
2. Click "Start Scanning" and allow camera access
3. Point camera at QR code
4. See validation result (Valid/Invalid)
5. Or enter ticket ID manually

## Project Structure

```
prototype/
├── server.js           # Express server and API endpoints
├── package.json        # Node.js dependencies
├── public/            # Frontend files
│   ├── index.html     # Ticket booking form
│   ├── scanner.html   # QR scanner interface
│   ├── ticket.html    # Ticket display page
│   ├── app.js         # Frontend JavaScript
│   └── style.css      # Styling
├── data/              # File-based database
│   └── tickets.json   # Stores all tickets
└── utils/             # Utility functions
    └── qr-utils.js    # QR generation and validation
```

## Technical Details

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Node.js + Express
- **QR Generation**: qrcode npm package
- **QR Scanning**: html5-qrcode library
- **Database**: JSON file storage
- **Security**: HMAC-SHA256 signatures in QR codes

## Ticket Pricing

- Adults: ₹50 per person
- Children (5-17): ₹25 per person
- Children under 5: Free

## Notes

- This is a prototype for demonstration purposes
- QR scanner requires HTTPS or localhost
- Camera permission required for QR scanning
- Tickets are valid only for the selected date
- Single entry tickets can be used once
- Daily passes allow multiple entries on the same day