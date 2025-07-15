const QRCode = require('qrcode');
const crypto = require('crypto');

// Secret key for HMAC (in production, this should be in environment variables)
const SECRET_KEY = 'hyderabad-parks-secret-key-2024';

// Generate HMAC signature for QR data
function generateSignature(data) {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(JSON.stringify(data))
    .digest('hex');
}

// Verify HMAC signature
function verifySignature(data, signature) {
  const expectedSignature = generateSignature(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Generate QR code for ticket
async function generateTicketQR(ticket) {
  const qrData = {
    id: ticket.id,
    visitDate: ticket.visitDate,
    type: ticket.ticketType
  };
  
  // Add signature for security
  qrData.signature = generateSignature({
    id: ticket.id,
    visitDate: ticket.visitDate
  });
  
  try {
    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });
    
    return qrCode;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

// Validate QR code data
function validateQRData(qrDataString) {
  try {
    const qrData = JSON.parse(qrDataString);
    
    // Check if required fields exist
    if (!qrData.id || !qrData.visitDate || !qrData.signature) {
      return { valid: false, error: 'Invalid QR code format' };
    }
    
    // Verify signature
    const isValidSignature = verifySignature(
      { id: qrData.id, visitDate: qrData.visitDate },
      qrData.signature
    );
    
    if (!isValidSignature) {
      return { valid: false, error: 'Invalid QR code signature' };
    }
    
    return { valid: true, data: qrData };
  } catch (error) {
    return { valid: false, error: 'Invalid QR code data' };
  }
}

module.exports = {
  generateTicketQR,
  validateQRData
};