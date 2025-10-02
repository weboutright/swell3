#!/bin/bash

# Swell Booking System - API URL Updater
# This script updates all HTML files to use your Google Apps Script API URL

echo "🌊 Swell Booking System - API URL Updater"
echo "=========================================="
echo ""

# Ask for the Google Apps Script URL
echo "Please enter your Google Apps Script deployment URL:"
echo "(e.g., https://script.google.com/macros/s/ABC123.../exec)"
read -p "API URL: " API_URL

if [ -z "$API_URL" ]; then
    echo "❌ Error: API URL cannot be empty"
    exit 1
fi

echo ""
echo "📝 Updating HTML files with API URL: $API_URL"
echo ""

# Update admin.html
echo "Updating admin.html..."
sed -i.bak "s|window\.location\.origin + window\.location\.pathname|'$API_URL'|g" admin.html

# Update widget.html if it has API calls
if [ -f "widget.html" ]; then
    echo "Updating widget.html..."
    sed -i.bak "s|window\.location\.origin + window\.location\.pathname|'$API_URL'|g" widget.html
fi

# Update pricing.html if it has API calls  
if [ -f "pricing.html" ]; then
    echo "Updating pricing.html..."
    sed -i.bak "s|window\.location\.origin + window\.location\.pathname|'$API_URL'|g" pricing.html
fi

# Update features.html if it has API calls
if [ -f "features.html" ]; then
    echo "Updating features.html..."
    sed -i.bak "s|window\.location\.origin + window\.location\.pathname|'$API_URL'|g" features.html
fi

# Update index.html if it has API calls
if [ -f "index.html" ]; then
    echo "Updating index.html..."
    sed -i.bak "s|window\.location\.origin + window\.location\.pathname|'$API_URL'|g" index.html
fi

echo ""
echo "✅ All HTML files updated successfully!"
echo ""
echo "📋 Backup files created with .bak extension"
echo "🧹 To remove backups, run: rm *.bak"
echo ""
echo "🚀 Next steps:"
echo "1. Review the changes in your HTML files"
echo "2. Push to GitHub: git add . && git commit -m 'Update API URL' && git push"
echo "3. Your site will be live with the new API connection!"
