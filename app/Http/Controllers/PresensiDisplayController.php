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
    public function index()
    {
        return Inertia::render('Display/PresensiQr');
    }

    public function getQrToken()
    {
        $token = 'MORA-' . Str::random(32);
        Cache::put('qr_token_' . $token, true, now()->addSeconds(30));

        return response()->json([
            'token' => $token,
            'expires_in' => 20
        ]);
    }

    public function getTodayAttendance()
    {
        $today = Carbon::today()->toDateString();
        $jamBatasMasuk = Carbon::parse($today . ' 08:00:00');

        $attendances = Presensi::with('peserta')
            ->whereDate('tanggal', $today)
            ->orderBy('jam_masuk', 'desc')
            ->get()
            ->map(function ($item) use ($jamBatasMasuk) {
                $statusWaktu = 'Tepat Waktu';
                $isLate = false;

                if ($item->jam_masuk) {
                    $jamAbsen = Carbon::parse($item->tanggal . ' ' . $item->jam_masuk);
                    if ($jamAbsen->gt($jamBatasMasuk)) {
                        $diffMinutes = $jamBatasMasuk->diffInMinutes($jamAbsen);
                        $statusWaktu = "Terlambat {$diffMinutes} mnt";
                        $isLate = true;
                    }
                }

                return [
                    'id' => $item->id,
                    'nama' => $item->peserta?->name ?? 'Peserta',
                    'nim_nis' => $item->peserta?->nim_nis ?? '-',
                    'jam_masuk' => $item->jam_masuk ? substr($item->jam_masuk, 0, 5) : '-',
                    'status_waktu' => $statusWaktu,
                    'is_late' => $isLate,
                ];
            });

        return response()->json([
            'data' => $attendances,
            'total_hadir' => $attendances->count(),
        ]);
    }
}