<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Presensi extends Model
{
    // Mengarahkan ke tabel 'presensi' yang sudah ada di Neon DB
    protected $table = 'presensi';

    // Mengizinkan semua kolom diisi
    protected $guarded = [];

    /**
     * Relasi ke data Peserta
     */
    public function peserta(): BelongsTo
    {
        return $this->belongsTo(Peserta::class, 'peserta_id');
    }
}