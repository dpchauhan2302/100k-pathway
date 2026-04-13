#!/bin/bash

# 100K PATHWAY - QUICK START SCRIPT
# This script automates the initial setup process

set -e  # Exit on error

echo "=================================="
echo "100K PATHWAY - QUICK START SETUP"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js installation
echo -e "${YELLOW}[1/8] Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ from nodejs.org${NC}"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}[2/8] Installing npm dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi
echo ""

# Create .env file
echo -e "${YELLOW}[3/8] Creating environment file...${NC}"
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env already exists, skipping...${NC}"
else
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from template${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi
echo ""

# Generate JWT secret
echo -e "${YELLOW}[4/8] Generating JWT secret...${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
if [ -f ".env" ]; then
    # Update JWT_SECRET in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    else
        # Linux
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    fi
    echo -e "${GREEN}✓ JWT secret generated and saved${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi
echo ""

# Check for required environment variables
echo -e "${YELLOW}[5/8] Checking environment configuration...${NC}"
source .env 2>/dev/null || true

MISSING_VARS=()
OPTIONAL_VARS=()

if [ -z "$SMTP_HOST" ]; then
    MISSING_VARS+=("SMTP_HOST")
fi

if [ -z "$SMTP_USER" ]; then
    MISSING_VARS+=("SMTP_USER")
fi

if [ -z "$SMTP_PASS" ] || [ "$SMTP_PASS" == "your-app-password" ]; then
    MISSING_VARS+=("SMTP_PASS")
fi

if [ -z "$FROM_EMAIL" ]; then
    MISSING_VARS+=("FROM_EMAIL")
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" == "your-super-secret-jwt-key-change-this" ]; then
    MISSING_VARS+=("JWT_SECRET")
fi

if [ -z "$STRIPE_SECRET_KEY" ] || [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
    OPTIONAL_VARS+=("STRIPE_SECRET_KEY (optional - only for real Stripe payments)")
fi

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All required variables configured${NC}"
else
    echo -e "${RED}❌ Missing configuration for: ${MISSING_VARS[*]}${NC}"
    echo -e "${YELLOW}   Please update .env with your actual values${NC}"
fi
if [ ${#OPTIONAL_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ Optional configuration pending: ${OPTIONAL_VARS[*]}${NC}"
fi
echo ""

# Test external database connection (optional)
echo -e "${YELLOW}[6/8] Testing external database connection (optional)...${NC}"
if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" == "https://your-project.supabase.co" ]; then
    echo -e "${YELLOW}⚠ Skipping (local file storage mode active)${NC}"
else
    # Simple curl test to Supabase
    if curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" | grep -q "200\|401"; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Cannot connect to database${NC}"
    fi
fi
echo ""

# Create necessary directories
echo -e "${YELLOW}[7/8] Creating directories...${NC}"
mkdir -p logs
mkdir -p uploads
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Test server startup
echo -e "${YELLOW}[8/8] Testing server startup...${NC}"
if [ -f "api/server.js" ]; then
    echo -e "${YELLOW}   Starting server (will timeout after 3 seconds)...${NC}"
    timeout 3s node api/server.js &> /dev/null || true
    if [ $? -eq 124 ]; then
        echo -e "${GREEN}✓ Server starts without errors${NC}"
    else
        echo -e "${YELLOW}⚠ Server may have configuration issues${NC}"
        echo -e "${YELLOW}   Check logs for details${NC}"
    fi
else
    echo -e "${RED}❌ api/server.js not found${NC}"
fi
echo ""

# Summary
echo "=================================="
echo -e "${GREEN}SETUP COMPLETE!${NC}"
echo "=================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Update .env with your actual credentials:"
echo "   - SMTP: your email provider app password"
echo "   - Stripe (optional): https://stripe.com → Developers → API Keys"
echo "   - Set PAYMENTS_SIMULATION=true if testing checkout without Stripe"
echo ""
echo "2. Local storage mode:"
echo "   - Applications/interviews are saved under: data/"
echo "   - No Supabase setup required"
echo ""
echo "3. Start the server:"
echo "   cd api"
echo "   node server.js"
echo ""
echo "4. Test locally:"
echo "   Open another terminal:"
echo "   python3 -m http.server 8001"
echo "   Visit: http://localhost:8001"
echo ""
echo "5. Deploy to production:"
echo "   npm install -g vercel"
echo "   vercel login"
echo "   vercel --prod"
echo ""
echo "Full documentation: See SETUP.md and DEPLOYMENT-CHECKLIST.md"
echo ""
echo "Questions? Check SETUP.md or email support@100k-pathway.com"
echo ""
