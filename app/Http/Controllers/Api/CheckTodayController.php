<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Presensi;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CheckTodayController extends Controller
{
    /**
     * Cek status presensi hari ini untuk peserta yang sedang login
     * 
     * Response:
     * - has_masuk: boolean (apakah sudah presensi masuk)
     * - has_pulang: boolean (apakah sudah presensi pulang)
     * - jam_masuk: string|null (jam masuk jika sudah presensi)
     * - jam_pulang: string|null (jam pulang jika sudah presensi)
     */
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

        if (!$presensiHariIni) {
            return response()->json([
                'success' => true,
                'data' => [
                    'has_masuk' => false,
                    'has_pulang' => false,
                    'jam_masuk' => null,
                    'jam_pulang' => null,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'has_masuk' => $presensiHariIni->jam_masuk !== null,
                'has_pulang' => $presensiHariIni->jam_pulang !== null,
                'jam_masuk' => $presensiHariIni->jam_masuk
                    ? substr($presensiHariIni->jam_masuk, 0, 5)
                    : null,
                'jam_pulang' => $presensiHariIni->jam_pulang
                    ? substr($presensiHariIni->jam_pulang, 0, 5)
                    : null,
            ],
        ]);
    }
}
