<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lamaran extends Model
{
    protected $table = 'lamaran';
    protected $guarded = [];

    protected $casts = [
        'applied_at' => 'datetime',
        'start_date' => 'date',
        'end_date' => 'date',
        'is_read_status' => 'boolean',
    ];

    /**
     * Peserta yang melamar (shared dari Neon DB moracademy)
     */
    public function peserta(): BelongsTo
    {
        return $this->belongsTo(Peserta::class, 'peserta_id');
    }
}
