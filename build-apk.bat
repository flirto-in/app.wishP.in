@echo off
echo ====================================
echo  WhispChat - APK Build Script
echo ====================================
echo.

REM Check if android folder exists
if not exist "android" (
    echo [ERROR] Android folder not found!
    echo Please run: npm run prebuild
    exit /b 1
)

echo [1/3] Cleaning previous builds...
cd android
call gradlew clean
if errorlevel 1 (
    echo [ERROR] Clean failed!
    cd ..
    exit /b 1
)

echo [2/3] Building Release APK...
call gradlew assembleRelease
if errorlevel 1 (
    echo [ERROR] Build failed!
    cd ..
    exit /b 1
)

cd ..

echo [3/3] Locating APK...
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo ====================================
    echo ✅ BUILD SUCCESSFUL!
    echo ====================================
    echo APK Location: android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo Next steps:
    echo 1. Install: adb install android\app\build\outputs\apk\release\app-release.apk
    echo 2. For Play Store: Build AAB with 'npm run build:aab'
    echo ====================================
) else (
    echo [ERROR] APK not found at expected location!
    exit /b 1
)
