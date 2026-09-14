<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JadwalPresensi extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama_jadwal',
        'jam_masuk',
        'jam_pulang',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];
}
