<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Presensi;
use App\Models\Lamaran; 
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class PresensiScanController extends Controller
{
    /**
     * Hitung jarak dua koordinat GPS (rumus Haversine) dalam satuan METER
     */
    private function getDistanceInMeters($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // Radius bumi dalam meter

        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Endpoint untuk memproses scan QR dari Mobile App
     */
    public function scan(Request $request)
    {
        $request->validate([
            'qr_token'  => 'required|string',
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        // 1. VALIDASI TOKEN QR (Apakah aktif dan belum kedaluwarsa)
        if (!Cache::has('qr_token_' . $request->qr_token)) {
            return response()->json([
                'success' => false,
                'message' => 'QR Code sudah kedaluwarsa atau tidak valid. Silakan scan ulang.'
            ], 422);
        }

        // 2. VALIDASI PESERTA (Status magang harus 'aktif')
        $user = $request->user(); 
        $peserta = $user->peserta;

        if (!$peserta) {
            return response()->json([
                'success' => false,
                'message' => 'Data profil peserta tidak ditemukan.'
            ], 404);
        }

        // Cek riwayat lamaran yang berstatus 'aktif' atau 'diterima'
        // (sama dengan logika di MobileAuthController moracademy)
        $lamaranAktif = Lamaran::where('peserta_id', $peserta->id)
            ->whereIn('status', ['aktif', 'diterima'])
            ->first();

        // Jika merupakan anggota tim, periksa juga status lamaran ketuanya
        if (!$lamaranAktif && $peserta->ketua_id) {
            $lamaranAktif = Lamaran::where('peserta_id', $peserta->ketua_id)
                ->whereIn('status', ['aktif', 'diterima'])
                ->first();
        }

        if (!$lamaranAktif) {
            return response()->json([
                'success' => false,
                'message' => 'Status magang Anda belum/tidak aktif.'
            ], 403);
        }

        // 3. VALIDASI RADIUS AREA KANTOR (Geofencing)
        // Set koordinat kantor kamu di sini
        $officeLat = -7.768033;   
        $officeLng = 110.420059;  
        $maxRadius = 100; // Jarak maksimal dalam meter

        $distance = $this->getDistanceInMeters(
            $request->latitude,
            $request->longitude,
            $officeLat,
            $officeLng
        );

        if ($distance > $maxRadius) {
            return response()->json([
                'success' => false,
                'message' => 'Anda berada di luar radius kantor! Jarak Anda: ' . round($distance) . ' meter (Maksimal: ' . $maxRadius . ' meter).'
            ], 422);
        }

        // 4. LOGIKA ABSEN MASUK & PULANG
        $today = Carbon::today()->toDateString();
        // Ambil jadwal default
        $jadwal = \App\Models\JadwalPresensi::where('is_default', true)->first();
        
        if (!$jadwal) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada jadwal presensi aktif hari ini.'
            ], 400);
        }

        $jamMasukJadwal = substr($jadwal->jam_masuk, 0, 5);
        $waktuSekarang = now()->format('H:i:s');
        $waktuSekarangHi = now()->format('H:i');

        // Menentukan apakah terlambat atau tidak
        $batasTerlambat = Carbon::createFromFormat('H:i', $jamMasukJadwal)->format('H:i');
        $isTerlambat = ($waktuSekarangHi > $batasTerlambat);
        $keteranganMasuk = $isTerlambat ? 'Presensi masuk via Mobile Scan (Terlambat)' : 'Presensi masuk via Mobile Scan';

        $presensiHariIni = Presensi::where('peserta_id', $peserta->id)
            ->whereDate('tanggal', $today)
            ->first();

        // SKENARIO A: Peserta sudah pernah absen hari ini
        if ($presensiHariIni) {

            // Cek apakah status merupakan izin — blokir presensi jika sedang izin
            $izinStatuses = ['sakit', 'izin pribadi', 'izin', 'lainnya'];
            if (in_array(strtolower($presensiHariIni->status), $izinStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak dapat melakukan presensi karena sedang dalam status izin (' . $presensiHariIni->status . ').',
                ], 422);
            }
            
            // Cek apakah jam pulang sudah terisi
            if ($presensiHariIni->jam_pulang !== null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah menyelesaikan presensi masuk dan pulang hari ini.'
                ], 422);
            }

            // Jika jam pulang masih kosong, lakukan UPDATE (Absen Pulang)
            $keteranganBaru = $presensiHariIni->keterangan . ' | Presensi pulang via Mobile Scan';
            
            if ($request->has('alasan_pulang') && !empty(trim($request->alasan_pulang))) {
                $keteranganBaru .= ' | Alasan Pulang Cepat: ' . trim($request->alasan_pulang);
            }

            $presensiHariIni->update([
                'jam_pulang' => $waktuSekarang,
                'keterangan' => $keteranganBaru
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Presensi pulang berhasil dicatat pada ' . $waktuSekarang,
                'data'    => $presensiHariIni
            ], 200);
        }

        // SKENARIO B: Peserta belum pernah absen hari ini -> Buat data baru (Absen Masuk)
        $presensiBaru = \App\Models\Presensi::create([
            'peserta_id' => $peserta->id,
            'tanggal'    => $today,
            'jam_masuk'  => $waktuSekarang,
            'status'     => 'hadir', // DB Constraint hanya mengizinkan: hadir, izin, sakit, alpa
            'lokasi'     => $request->latitude . ', ' . $request->longitude,
            'keterangan' => $keteranganMasuk
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Presensi MASUK berhasil dicatat pada pukul ' . $waktuSekarang,
            'data'    => $presensiBaru
        ], 200);
    }
}