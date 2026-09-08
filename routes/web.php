<?php

use App\Http\Controllers\PresensiDisplayController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PresensiScanController;
use Inertia\Inertia;

// 1. HALAMAN UTAMA: Langsung menampilkan layar Monitor QR Presensi
Route::get('/', [PresensiDisplayController::class, 'index'])->name('display.presensi');

// 2. API ENDPOINT: Penyuplai Token QR & Data Kehadiran Real-time
Route::get('/api/qr-token', [PresensiDisplayController::class, 'getQrToken'])->name('api.qr.token');
Route::get('/api/today-attendance', [PresensiDisplayController::class, 'getTodayAttendance'])->name('api.today.attendance');

// 3. RUTE BAWAAN BREEZE (Tetap dipertahankan jika sewaktu-waktu butuh login admin)
Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});
Route::middleware('auth:sanctum')->group(function () {
    // Route untuk scan presensi dari mobile app
    Route::post('/presensi/scan', [PresensiScanController::class, 'scan']);
});
require __DIR__.'/auth.php';