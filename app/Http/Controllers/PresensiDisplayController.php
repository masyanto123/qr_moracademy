<?php

namespace App\Http\Controllers;

use App\Models\Presensi;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use Inertia\Inertia;

class PresensiDisplayController extends Controller
{
    /**
     * Tampilan Halaman Monitor Display QR
     */
    public function index()
    {
        return Inertia::render('Display/PresensiQr');
    }

    /**
     * API: Generate Dynamic QR Token (Refresh tiap 20-30 detik)
     */
    public function getQrToken()
    {
        $token = 'MORA-' . Str::random(32);
        
        // Simpan token ke cache selama 30 detik untuk toleransi pemindaian
        Cache::put('qr_token_' . $token, true, now()->addSeconds(30));

        return response()->json([
            'token' => $token,
            'expires_in' => 20
        ]);
    }

    /**
     * API: Ambil data kehadiran hari ini beserta ringkasan statistik
     */
    public function getTodayAttendance()
    {
        $today = Carbon::today()->toDateString();
        $jamBatasMasuk = Carbon::parse($today . ' 08:00:00'); // Batas waktu jam masuk

        $attendances = Presensi::with('peserta')
            ->whereDate('tanggal', $today)
            ->orderBy('jam_masuk', 'desc')
            ->get()
            ->map(function ($item) use ($jamBatasMasuk) {
                $statusWaktu = 'Tepat Waktu';
                $isLate = false;

                if (!empty($item->jam_masuk)) {
                    $jamAbsen = Carbon::parse($item->tanggal . ' ' . $item->jam_masuk);
                    if ($jamAbsen->gt($jamBatasMasuk)) {
                        $diffMinutes = (int) $jamBatasMasuk->diffInMinutes($jamAbsen);
                        
                        $hours = floor($diffMinutes / 60);
                        $minutes = $diffMinutes % 60;

                        if ($hours > 0) {
                            $statusWaktu = $minutes > 0 
                                ? "Terlambat {$hours} jam {$minutes} menit" 
                                : "Terlambat {$hours} jam";
                        } else {
                            $statusWaktu = "Terlambat {$minutes} menit";
                        }
                        
                        $isLate = true;
                    }
                }

                return [
                    'id' => $item->id,
                    'nama' => $item->peserta?->name ?? 'Peserta',
                    'nim_nis' => $item->peserta?->nim_nis ?? '-',
                    'jam_masuk' => $item->jam_masuk ? substr($item->jam_masuk, 0, 5) : '-',
                    'jam_pulang' => $item->jam_pulang ? substr($item->jam_pulang, 0, 5) : '-',
                    'status_waktu' => $statusWaktu,
                    'is_late' => $isLate,
                ];
            });

        $totalHadir = $attendances->count();
        $totalTerlambat = $attendances->where('is_late', true)->count();
        $totalTepatWaktu = $totalHadir - $totalTerlambat;

        return response()->json([
            'data' => $attendances,
            'meta' => [
                'total_hadir' => $totalHadir,
                'tepat_waktu' => $totalTepatWaktu,
                'terlambat'   => $totalTerlambat,
            ]
        ]);
    }
}