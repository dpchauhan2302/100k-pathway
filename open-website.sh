#!/bin/bash

echo "Starting local server..."
cd "/Users/vishwa/Desktop/100k Pathway"
python3 -m http.server 3000 &
sleep 3

echo ""
echo "==========================================="
echo "YOUR WEBSITE IS NOW LIVE!"
echo "==========================================="
echo ""
echo "Website URL: http://localhost:3000"
echo ""
echo "To view your website:"
echo "1. Open Safari, Chrome, or Firefox"
echo "2. Go to http://localhost:3000"
echo ""
echo "To stop the server later, run: pkill -f 'http.server'"
echo ""
echo "==========================================="
echo ""

# Try to open in Safari
/usr/bin/open -a Safari "http://localhost:3000" 2>/dev/null || echo "Please manually open http://localhost:3000 in your browser"

# Keep the script running
wait