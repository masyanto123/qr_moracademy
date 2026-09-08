<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Peserta extends Model
{
    protected $table = 'peserta';
    protected $guarded = [];

    /**
     * Relasi ke akun user (shared dari Neon DB moracademy)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relasi ke data lamaran (shared dari Neon DB moracademy)
     */
    public function riwayatLamaran(): HasMany
    {
        return $this->hasMany(Lamaran::class, 'peserta_id');
    }

    /**
     * Relasi ke data presensi
     */
    public function presensi(): HasMany
    {
        return $this->hasMany(Presensi::class, 'peserta_id');
    }
}