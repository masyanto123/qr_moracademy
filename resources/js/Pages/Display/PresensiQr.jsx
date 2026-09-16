import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";
import { Clock, RefreshCw, Users, CheckCircle2, AlertTriangle } from "lucide-react";

export default function PresensiQr() {
    const [qrToken, setQrToken] = useState("");
    const [countdown, setCountdown] = useState(20);
    const [attendances, setAttendances] = useState([]);
    const [stats, setStats] = useState({ total_hadir: 0, tepat_waktu: 0, terlambat: 0 });
    const [currentTime, setCurrentTime] = useState(new Date());

    // 1. Update Jam Digital Setiap Detik
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Fetch QR Token Baru
    const fetchToken = async () => {
        try {
            const res = await axios.get("/api/qr-token");
            setQrToken(res.data.token);
            setCountdown(20);
        } catch (err) {
            console.error("Gagal load QR Token", err);
        }
    };

    // 3. Fetch Data Kehadiran & Statistik (Live Poll tiap 5 detik)
    const fetchAttendance = async () => {
        try {
            const res = await axios.get("/api/today-attendance");
            setAttendances(res.data.data);
            if (res.data.meta) {
                setStats(res.data.meta);
            }
        } catch (err) {
            console.error("Gagal load data kehadiran", err);
        }
    };

    useEffect(() => {
        fetchToken();
        fetchAttendance();

        const qrInterval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    fetchToken();
                    return 20;
                }
                return prev - 1;
            });
        }, 1000);

        const attendanceInterval = setInterval(() => {
            fetchAttendance();
        }, 5000);

        return () => {
            clearInterval(qrInterval);
            clearInterval(attendanceInterval);
        };
    }, []);

    // Pisahkan data yang hadir dan izin
    const hadirAttendances = attendances.filter(item => !['izin', 'sakit'].includes(item.status?.toLowerCase()));
    const izinAttendances = attendances.filter(item => ['izin', 'sakit'].includes(item.status?.toLowerCase()));

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8 flex flex-col justify-between overflow-x-hidden">
            {/* Header Jam & Tanggal */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-200 pb-5 mb-6 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-indigo-950">
                        MORACADEMY <span className="text-indigo-600 font-normal">| Presensi Harian</span>
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Pindai QR Code menggunakan aplikasi mobile peserta magang.
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-3xl md:text-4xl font-mono font-bold text-slate-800">
                        {currentTime.toLocaleTimeString("id-ID")}
                    </div>
                    <div className="text-sm font-medium text-slate-500">
                        {currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                </div>
            </div>

            {/* Grid Konten (4 Kolom Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
                
                {/* Kolom Kiri: List Kehadiran Hari Ini (Lebar 2 Kolom) */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-800">Daftar Kehadiran Hari Ini</h2>
                        </div>
                        <span className="bg-slate-50 text-slate-500 font-medium px-3 py-1 rounded-full text-[10px] border border-slate-200">
                            Live Update (5s)
                        </span>
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                        {hadirAttendances.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Clock className="w-10 h-10 mb-3 text-slate-200 stroke-[1.5]" />
                                <p className="text-sm font-medium">Belum ada data presensi hari ini.</p>
                            </div>
                        ) : (
                            hadirAttendances.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 transition rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                            {item.nama.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{item.nama}</h3>
                                            <p className="text-[11px] text-slate-500 mt-0.5">NIM/NIS: {item.nim_nis}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Masuk</span>
                                            <span className="text-xs font-mono font-bold text-slate-700">{item.jam_masuk}</span>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Pulang</span>
                                            <span className="text-xs font-mono font-bold text-slate-700">{item.jam_pulang}</span>
                                        </div>
                                        <div className="min-w-[90px] text-right ml-1">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${item.is_late ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                                                {item.status_waktu}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Kolom Tengah: Statistik & Izin (Lebar 1 Kolom) */}
                <div className="lg:col-span-1 flex flex-col gap-6 h-[600px]">
                    {/* Kotak Statistik Ringkas */}
                    <div className="bg-indigo-600 rounded-3xl p-5 shadow-sm text-white shrink-0 relative overflow-hidden">
                        {/* Ornamen Latar */}
                        <div className="absolute -right-6 -top-6 bg-indigo-500 w-24 h-24 rounded-full opacity-50 blur-xl"></div>
                        <div className="absolute -left-6 -bottom-6 bg-indigo-700 w-24 h-24 rounded-full opacity-50 blur-xl"></div>
                        
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div>
                                <p className="text-[11px] text-indigo-200 font-medium mb-1.5 uppercase tracking-wide">Hadir</p>
                                <h3 className="text-4xl font-black">{stats.total_hadir ?? 0}</h3>
                                <p className="text-[10px] text-indigo-300 mt-1 font-medium">Peserta</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-indigo-200 font-medium mb-1.5 uppercase tracking-wide">Izin</p>
                                <h3 className="text-4xl font-black">{stats.total_izin ?? 0}</h3>
                                <p className="text-[10px] text-indigo-300 mt-1 font-medium">Peserta</p>
                            </div>
                        </div>
                    </div>

                    {/* Kotak Daftar Izin */}
                    <div className="bg-amber-50 rounded-3xl p-5 shadow-sm border border-amber-100 flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 shrink-0">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <h3 className="text-sm font-bold text-amber-900">Daftar Izin</h3>
                        </div>
                        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                            {izinAttendances.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-amber-400">
                                    <p className="text-xs font-medium text-center px-4">Tidak ada peserta magang yang izin hari ini.</p>
                                </div>
                            ) : (
                                izinAttendances.map((item) => (
                                    <div key={item.id} className="flex flex-col p-3 bg-white rounded-2xl border border-amber-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xs font-bold text-slate-800 line-clamp-1">{item.nama}</h3>
                                            <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                                            {item.keterangan || "Tidak ada keterangan dari peserta."}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Kotak QR Code & Info (Lebar 1 Kolom) */}
                <div className="lg:col-span-1 flex flex-col gap-6 h-[600px]">
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3">
                            Pindai Cepat
                        </span>
                        <h2 className="text-lg font-black text-slate-800 mb-1">Pindai QR Code</h2>
                        <p className="text-[11px] text-slate-400 mb-5 font-medium px-4">
                            Arahkan kamera ke kode di bawah
                        </p>

                        <div className="p-4 bg-white border-2 border-dashed border-indigo-200 rounded-2xl shadow-sm mb-4">
                            {qrToken ? (
                                <QRCodeSVG value={qrToken} size={160} level="M" includeMargin={true} />
                            ) : (
                                <div className="w-[160px] h-[160px] flex items-center justify-center text-slate-400 text-xs font-medium">
                                    Loading...
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-full">
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                            <span>Update dalam: <strong className="text-indigo-600 text-xs ml-1">{countdown}s</strong></span>
                        </div>
                    </div>

                    <div className="bg-indigo-900 rounded-3xl p-5 shadow-sm text-white flex-1 relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute right-0 top-0 opacity-5">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2 relative z-10 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Syarat Presensi
                        </h3>
                        <ul className="text-[11px] text-indigo-200 space-y-2 relative z-10 font-medium">
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5 w-1 h-1 rounded-full bg-emerald-400 shrink-0"></div>
                                Pastikan GPS / Lokasi aktif di smartphone Anda.
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5 w-1 h-1 rounded-full bg-emerald-400 shrink-0"></div>
                                Anda harus berada dalam radius kantor.
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5 w-1 h-1 rounded-full bg-emerald-400 shrink-0"></div>
                                Kamera harus diberi izin akses pada aplikasi.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}