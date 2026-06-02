@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════════
echo   ساختمان یار — راه‌اندازی اولیه
echo   Sakhteman Yar — Initial Setup
echo ═══════════════════════════════════════════════════════
echo.

:: ─── بررسی Node.js ───
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطا] Node.js نصب نیست!
    echo لطفاً از https://nodejs.org نسخه LTS را دانلود و نصب کنید.
    pause
    exit /b 1
)

echo [بررسی] نسخه Node.js:
node --version
echo.

:: ─── ساخت پوشه db ───
echo [۱/۶] ساخت پوشه دیتابیس ...
if not exist "db" (
    mkdir db
    echo         پوشه db/ ساخته شد.
) else (
    echo         پوشه db/ از قبل وجود دارد.
)
echo.

:: ─── بررسی فایل .env ───
echo [۲/۶] بررسی فایل پیکربندی ...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo         فایل .env از .env.example کپی شد.
    ) else (
        (
            echo # ساختمان یار — پیکربندی محیطی
            echo DATABASE_URL=file:./db/custom.db
            echo NEXTAUTH_SECRET=sakhteman-yar-erp-secret-key-2024-change-in-production
            echo NEXTAUTH_URL=http://localhost:3000
            echo NODE_ENV=development
        ) > .env
        echo         فایل .env با مقادیر پیش‌فرض ساخته شد.
    )
) else (
    echo         فایل .env از قبل وجود دارد.
)
echo.

:: ─── نصب وابستگی‌ها ───
echo [۳/۶] نصب وابستگی‌ها ...
call npm install
if %errorlevel% neq 0 (
    echo [خطا] نصب وابستگی‌ها ناموفق بود!
    echo.
    echo نکته: اگر خطای مربوط به 'sharp' دیدید، نگران نباشید.
    echo پکیج sharp اختیاری است و بدون آن هم سیستم کار می‌کند.
    echo.
    echo دوباره تلاش کنید: npm install --ignore-optional
    pause
    exit /b 1
)
echo.

:: ─── ساخت Prisma Client ───
echo [۴/۶] ساخت Prisma Client ...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [خطا] ساخت Prisma Client ناموفق بود!
    pause
    exit /b 1
)
echo.

:: ─── همگام‌سازی دیتابیس ───
echo [۵/۶] همگام‌سازی دیتابیس ...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [هشدار] همگام‌سازی دیتابیس با خطا مواجه شد — ادامه می‌دهیم...
    echo         مطمئن شوید فایل .env با DATABASE_URL صحیح تنظیم شده است.
)
echo.

:: ─── پر کردن دیتابیس با داده‌های نمونه ───
echo [۶/۶] پر کردن دیتابیس با داده‌های نمونه ...
echo       (داده نمونه بعد از اجرای سرور با دستور زیر اضافه می‌شود)
echo       curl -s "http://localhost:3000/api/seed?token=seed-dev-2024"
echo.

echo ═══════════════════════════════════════════════════════
echo   ✔ راه‌اندازی کامل شد!
echo.
echo   حالا اجرا کنید:  npm run dev
echo   سپس مرورگر:     http://localhost:3000
echo.
echo   حساب‌های آزمایشی (بعد از seed):
echo   مدیر کل:      کدملی=1234567890  موبایل=09121234567
echo   مدیر پروژه:   کدملی=1234567891  موبایل=09122345678
echo   مسئول خرید:   کدملی=1234567892  موبایل=09123456789
echo   انباردار:      کدملی=1234567893  موبایل=09124567890
echo   ادمین سیستم:  کدملی=1234567894  موبایل=09125678901
echo ═══════════════════════════════════════════════════════
echo.
pause
