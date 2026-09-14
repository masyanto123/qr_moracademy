<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Presensi;
use App\Models\JadwalPresensi;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CheckTodayController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $peserta = $user->peserta;

        if (!$peserta) {
            return response()->json([
                'success' => false,
                'message' => 'Data profil peserta tidak ditemukan.',
            ], 404);
        }

        $today = Carbon::today()->toDateString();
        $presensiHariIni = Presensi::where('peserta_id', $peserta->id)
            ->whereDate('tanggal', $today)
            ->first();

        // Ambil jadwal default (jika ada), jika tidak gunakan fallback
        $jadwal = JadwalPresensi::where('is_default', true)->first();
        $hasJadwal = $jadwal ? true : false;
        $jamMasukJadwal = $jadwal ? substr($jadwal->jam_masuk, 0, 5) : '08:00';
        $jamPulangJadwal = $jadwal ? substr($jadwal->jam_pulang, 0, 5) : '16:00';
        
        $waktuSekarang = now()->format('H:i');
        
        // Logika disabled masuk: jika belum absen masuk dan sudah melewati/sama dengan jam pulang
        $hasMasuk = $presensiHariIni && $presensiHariIni->jam_masuk !== null;
        $isDisabledMasuk = !$hasMasuk && ($waktuSekarang >= $jamPulangJadwal);

        if (!$presensiHariIni) {
            return response()->json([
                'success' => true,
                'data' => [
                    'has_masuk' => false,
                    'has_pulang' => false,
                    'has_izin' => false,
                    'status' => null,
                    'jam_masuk' => null,
                    'jam_pulang' => null,
                    'is_disabled_masuk' => $isDisabledMasuk,
                    'has_jadwal' => $hasJadwal,
                    'jadwal_masuk' => $jamMasukJadwal,
                    'jadwal_pulang' => $jamPulangJadwal,
                ],
            ]);
        }

        // Cek apakah status presensi merupakan izin (bukan 'hadir')
        $izinStatuses = ['sakit', 'izin pribadi', 'izin', 'lainnya'];
        $isIzin = in_array(strtolower($presensiHariIni->status), $izinStatuses);

        return response()->json([
            'success' => true,
            'data' => [
                'has_masuk' => $hasMasuk,
                'has_pulang' => $presensiHariIni->jam_pulang !== null,
                'has_izin' => $isIzin,
                'status' => $presensiHariIni->status,
                'jam_masuk' => $presensiHariIni->jam_masuk
                    ? substr($presensiHariIni->jam_masuk, 0, 5)
                    : null,
                'jam_pulang' => $presensiHariIni->jam_pulang
                    ? substr($presensiHariIni->jam_pulang, 0, 5)
                    : null,
                'is_disabled_masuk' => $isDisabledMasuk,
                'has_jadwal' => $hasJadwal,
                'jadwal_masuk' => $jamMasukJadwal,
                'jadwal_pulang' => $jamPulangJadwal,
            ],
        ]);
    }
}
