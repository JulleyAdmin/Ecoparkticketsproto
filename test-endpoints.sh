#!/bin/bash

# Test script for QR Ticketing System with LAN Controller
# Usage: ./test-endpoints.sh [SERVER_IP]

SERVER=${1:-localhost}
PORT=3000
BASE_URL="http://$SERVER:$PORT"

echo "Testing QR Ticketing System at $BASE_URL"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${GREEN}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        curl -s -X $method "$BASE_URL$endpoint" | python3 -m json.tool
    else
        curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" | python3 -m json.tool
    fi
    
    echo ""
}

# 1. Test Controller Status
test_endpoint "GET" "/api/controller/status" "" "Controller Status Check"

# 2. Send Controller Heartbeat
test_endpoint "POST" "/api/controller/heartbeat" "{}" "Controller Heartbeat"

# 3. Create a Test Ticket
TICKET_DATA='{
    "visitorName": "LAN Test User",
    "phone": "9876543210",
    "visitDate": "'$(date +%Y-%m-%d)'",
    "ticketType": "single",
    "adultCount": 2,
    "childCount": 1
}'
echo -e "\n${GREEN}Creating test ticket...${NC}"
TICKET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tickets" \
    -H "Content-Type: application/json" \
    -d "$TICKET_DATA")
echo "$TICKET_RESPONSE" | python3 -m json.tool

# Extract ticket ID from response
TICKET_ID=$(echo "$TICKET_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['ticket']['id'])" 2>/dev/null)

if [ ! -z "$TICKET_ID" ]; then
    echo -e "\n${GREEN}Ticket created: $TICKET_ID${NC}"
    
    # 4. Get Ticket Details
    test_endpoint "GET" "/api/tickets/$TICKET_ID" "" "Get Ticket Details"
    
    # 5. Simulate QR Validation (this will create a gate command)
    QR_DATA=$(echo "$TICKET_RESPONSE" | python3 -c "
import sys, json
ticket = json.load(sys.stdin)['ticket']
qr_data = {
    'id': ticket['id'],
    'visitDate': ticket['visitDate'],
    'type': ticket['ticketType'],
    'signature': 'test-signature'  # This will fail signature check
}
print(json.dumps(qr_data))
" 2>/dev/null)
    
    echo -e "\n${GREEN}Note: QR validation will fail due to signature mismatch in test${NC}"
    echo "In real usage, QR codes are scanned from the generated image"
fi

# 6. Check for Gate Commands
test_endpoint "GET" "/api/gate/commands" "" "Poll for Gate Commands"

# 7. Test Admin Dashboard Data
test_endpoint "GET" "/admin/dashboard" "" "Admin Dashboard Data"

# 8. Show Network Configuration
echo -e "\n${GREEN}Network Configuration for LAN Testing:${NC}"
echo "======================================="
echo "Server PC IP: 192.168.1.100"
echo "Controller IP: 192.168.1.101"
echo "Subnet Mask: 255.255.255.0"
echo ""
echo "Access URLs from LAN devices:"
echo "- Booking: http://192.168.1.100:3000"
echo "- Scanner: http://192.168.1.100:3000/scanner"
echo "- Admin: http://192.168.1.100:3000/admin"

echo -e "\n${GREEN}Controller Simulator Command:${NC}"
echo "SERVER_HOST=$SERVER node controller-simulator.js"

echo -e "\n${GREEN}Test Complete!${NC}"