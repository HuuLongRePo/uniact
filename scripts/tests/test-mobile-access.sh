#!/bin/bash

echo "🔧 MOBILE ACCESS FIX - Testing Script"
echo "========================================"
echo ""

echo "1️⃣ Kiểm tra IP máy tính:"
ipconfig | findstr "IPv4" | head -1
echo ""

echo "2️⃣ Kiểm tra port 3000 có đang mở không:"
netstat -an | findstr ":3000" | head -5
echo ""

echo "3️⃣ Test kết nối local:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 2>/dev/null || echo "❌ Localhost không kết nối được"
echo ""

echo "4️⃣ Test kết nối qua IP:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://10.90.224.58:3000 2>/dev/null || echo "❌ IP không kết nối được"
echo ""

echo "5️⃣ Test API health endpoint:"
curl -s http://10.90.224.58:3000/api/health | head -c 100
echo ""
echo ""

echo "📱 Để test từ mobile:"
echo "   1. Mở browser trên điện thoại"
echo "   2. Vào: http://10.90.224.58:3000"
echo "   3. Nếu vẫn stuck, check Console trong Chrome DevTools"
echo ""

echo "🔍 Debug tips:"
echo "   • Xem server logs khi mobile truy cập"
echo "   • Kiểm tra Network tab trên mobile browser"
echo "   • Test API trực tiếp: http://10.90.224.58:3000/api/health"
