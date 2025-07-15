// Set minimum date to today
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('visitDate').setAttribute('min', today);
    document.getElementById('visitDate').value = today;
});

// Calculate total amount
function calculateTotal() {
    const adultCount = parseInt(document.getElementById('adultCount').value) || 0;
    const childCount = parseInt(document.getElementById('childCount').value) || 0;
    const total = (adultCount * 50) + (childCount * 25);
    document.getElementById('totalAmount').textContent = total;
}

// Add event listeners for amount calculation
document.getElementById('adultCount').addEventListener('input', calculateTotal);
document.getElementById('childCount').addEventListener('input', calculateTotal);

// Handle form submission
document.getElementById('ticketForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        visitorName: document.getElementById('visitorName').value,
        phone: document.getElementById('phone').value,
        visitDate: document.getElementById('visitDate').value,
        ticketType: document.querySelector('input[name="ticketType"]:checked').value,
        adultCount: parseInt(document.getElementById('adultCount').value),
        childCount: parseInt(document.getElementById('childCount').value)
    };
    
    try {
        const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create ticket');
        }
        
        const result = await response.json();
        displayTicket(result);
        
    } catch (error) {
        alert('Error creating ticket: ' + error.message);
    }
});

// Display generated ticket
function displayTicket(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <div class="ticket">
            <h2>Ticket Generated Successfully!</h2>
            <div class="ticket-id">Ticket ID: ${data.ticket.id}</div>
            
            <div class="qr-container">
                <img src="${data.qrCode}" alt="QR Code" class="qr-code">
            </div>
            
            <div class="ticket-details">
                <p><strong>Visitor:</strong> ${data.ticket.visitorName}</p>
                <p><strong>Phone:</strong> ${data.ticket.phone}</p>
                <p><strong>Visit Date:</strong> ${new Date(data.ticket.visitDate).toLocaleDateString()}</p>
                <p><strong>Ticket Type:</strong> ${data.ticket.ticketType === 'single' ? 'Single Entry' : 'Daily Pass'}</p>
                <p><strong>Visitors:</strong> ${data.ticket.adultCount} Adults, ${data.ticket.childCount} Children</p>
                <p><strong>Total Amount:</strong> ₹${data.ticket.totalAmount}</p>
            </div>
            
            <div class="ticket-actions">
                <button onclick="downloadTicket('${data.ticket.id}')" class="btn-secondary">Download Ticket</button>
                <button onclick="location.reload()" class="btn-primary">Book Another Ticket</button>
            </div>
        </div>
    `;
    
    resultDiv.style.display = 'block';
    document.getElementById('ticketForm').style.display = 'none';
}

// Download ticket function
function downloadTicket(ticketId) {
    window.open(`/ticket/${ticketId}`, '_blank');
}