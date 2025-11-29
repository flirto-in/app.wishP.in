#!/bin/bash

echo "===================================="
echo " WhispChat - APK Build Script"
echo "===================================="
echo ""

# Check if android folder exists
if [ ! -d "android" ]; then
    echo "[ERROR] Android folder not found!"
    echo "Please run: npm run prebuild"
    exit 1
fi

echo "[1/3] Cleaning previous builds..."
cd android
./gradlew clean
if [ $? -ne 0 ]; then
    echo "[ERROR] Clean failed!"
    cd ..
    exit 1
fi

echo "[2/3] Building Release APK..."
./gradlew assembleRelease
if [ $? -ne 0 ]; then
    echo "[ERROR] Build failed!"
    cd ..
    exit 1
fi

cd ..

echo "[3/3] Locating APK..."
if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    echo ""
    echo "===================================="
    echo "✅ BUILD SUCCESSFUL!"
    echo "===================================="
    echo "APK Location: android/app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "Next steps:"
    echo "1. Install: adb install android/app/build/outputs/apk/release/app-release.apk"
    echo "2. For Play Store: Build AAB with 'npm run build:aab'"
    echo "===================================="
else
    echo "[ERROR] APK not found at expected location!"
    exit 1
fi
