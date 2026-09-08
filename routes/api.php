<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PresensiScanController;
use App\Http\Controllers\Api\CheckTodayController;

// =========================================================================
// API PRESENSI MOBILE
// Dilindungi Sanctum — token dari moracademy valid karena shared Neon DB.
// Route di api.php TIDAK melalui CSRF middleware, cocok untuk mobile app.
// =========================================================================
Route::middleware('auth:sanctum')->group(function () {
    // Scan QR untuk presensi masuk/pulang
    Route::post('/presensi/scan', [PresensiScanController::class, 'scan']);
    // Cek status presensi hari ini
    Route::get('/presensi/check-today', CheckTodayController::class);
});
