<?php

namespace App\Http\Controllers;

use App\Models\Presensi;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use Inertia\Inertia;
use App\Models\Lamaran;
use App\Models\JadwalPresensi;
use Illuminate\Support\Facades\DB;

class PresensiDisplayController extends Controller
{
    /**
     * Tampilan Halaman Monitor Display QR
     */
    public function index($qr_token)
    {
        $perusahaan = DB::table('perusahaans')->where('qr_token', $qr_token)->first();
        if (!$perusahaan) {
            abort(404, 'Layar QR tidak ditemukan atau token tidak valid.');
        }

        return Inertia::render('Display/PresensiQr', [
            'qrToken' => $qr_token,
            'companyName' => $perusahaan->name
        ]);
    }

    /**
     * API: Generate Dynamic QR Token (Refresh tiap 20-30 detik)
     */
    public function getQrToken($qr_token)
    {
        $perusahaan = DB::table('perusahaans')->where('qr_token', $qr_token)->first();
        if (!$perusahaan) abort(404);

        $qrType = $perusahaan->qr_type ?? 'dinamis';
        $qrTimer = (int) ($perusahaan->qr_timer ?? 30);
        
        if ($qrType === 'statis') {
            // Jika statis, gunakan token yang tidak berubah, tapi tetap mengikuti format MORA-{id}-{...}
            $token = 'MORA-' . $perusahaan->id . '-' . substr(md5($perusahaan->qr_token), 0, 24);
            
            return response()->json([
                'token' => $token,
                'expires_in' => 3600 * 24 // 24 jam (seakan-akan tidak expired di view)
            ]);
        }

        $token = 'MORA-' . $perusahaan->id . '-' . Str::random(24);
        
        // Simpan token ke cache selama (timer + toleransi 10 detik) untuk pemindaian
        Cache::put('qr_token_' . $token, true, now()->addSeconds($qrTimer + 10));

        return response()->json([
            'token' => $token,
            'expires_in' => $qrTimer
        ]);
    }

    /**
     * API: Ambil data kehadiran hari ini beserta ringkasan statistik
     */
    public function getTodayAttendance($qr_token)
    {
        $perusahaan = DB::table('perusahaans')->where('qr_token', $qr_token)->first();
        if (!$perusahaan) abort(404);

        $companyId = $perusahaan->id;
        $today = Carbon::today()->toDateString();
        
        $attendances = Presensi::with(['peserta.riwayatLamaran' => function($q) use ($companyId) {
            $q->whereIn('status', ['aktif', 'diterima'])->where('perusahaan_id', $companyId);
        }])
            ->whereHas('peserta.riwayatLamaran', function($q) use ($companyId) {
                $q->whereIn('status', ['aktif', 'diterima'])->where('perusahaan_id', $companyId);
            })
            ->whereDate('tanggal', $today)
            ->orderBy('jam_masuk', 'desc')
            ->get()
            ->map(function ($item) use ($today) {
                // 1. Tentukan Jadwal Presensi Dinamis
                $perusahaan_id = null;
                $lamaranAktif = $item->peserta?->riwayatLamaran?->first();
                
                // Jika tidak punya lamaran aktif, coba cek lamaran ketua timnya
                if (!$lamaranAktif && $item->peserta?->ketua_id) {
                    $lamaranAktif = Lamaran::where('peserta_id', $item->peserta->ketua_id)
                        ->whereIn('status', ['aktif', 'diterima'])
                        ->first();
                }

                if ($lamaranAktif) {
                    $perusahaan_id = $lamaranAktif->perusahaan_id; // Menggunakan kolom langsung jika ada
                }

                if ($perusahaan_id) {
                    $jadwal = JadwalPresensi::where('perusahaan_id', $perusahaan_id)
                                ->where('is_default', true)
                                ->first();
                } else {
                    $jadwal = JadwalPresensi::where('is_default', true)->first();
                }

                $jamMasukJadwal = $jadwal ? substr($jadwal->jam_masuk, 0, 8) : '08:00:00';
                $jamBatasMasuk = Carbon::parse($today . ' ' . $jamMasukJadwal);

                // 2. Hitung Keterlambatan
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
                    'status' => $item->status ?? 'hadir',
                    'keterangan' => $item->keterangan ?? '-',
                ];
            });

        $totalTerlambat = $attendances->where('is_late', true)->whereIn('status', ['hadir', null])->count();
        $totalHadir = $attendances->whereIn('status', ['hadir', null])->count();
        $totalTepatWaktu = $totalHadir - $totalTerlambat;
        $totalIzin = $attendances->whereIn('status', ['izin', 'sakit'])->count();

        return response()->json([
            'data' => $attendances,
            'meta' => [
                'total_hadir' => $totalHadir,
                'tepat_waktu' => $totalTepatWaktu,
                'terlambat'   => $totalTerlambat,
                'total_izin'  => $totalIzin,
            ]
        ]);
    }
}