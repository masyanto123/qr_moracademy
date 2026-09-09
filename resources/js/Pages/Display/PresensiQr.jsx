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

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8 flex flex-col justify-between">
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

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Hadir</span>
                        <p className="text-2xl font-black text-slate-800 mt-1">{stats.total_hadir}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-500" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tepat Waktu</span>
                        <p className="text-2xl font-black text-emerald-600 mt-1">{stats.tepat_waktu}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Terlambat</span>
                        <p className="text-2xl font-black text-rose-600 mt-1">{stats.terlambat}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                    </div>
                </div>
            </div>

            {/* Grid Konten */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
                
                {/* Kolom Kiri: List Kehadiran Hari Ini */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-800">Daftar Kehadiran Hari Ini</h2>
                        </div>
                        <span className="bg-slate-50 text-slate-500 font-medium px-3 py-1 rounded-full text-xs border border-slate-200">
                            Live Update (5s)
                        </span>
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                        {attendances.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Clock className="w-10 h-10 mb-3 text-slate-300 stroke-[1.5]" />
                                <p className="text-sm font-medium">Belum ada peserta yang presensi hari ini.</p>
                            </div>
                        ) : (
                            attendances.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 transition rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                                            {item.nama.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">{item.nama}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">NIM/NIS: {item.nim_nis}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Masuk</span>
                                            <span className="text-sm font-mono font-bold text-slate-700">{item.jam_masuk}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Pulang</span>
                                            <span className="text-sm font-mono font-bold text-slate-700">{item.jam_pulang}</span>
                                        </div>
                                        <div className="min-w-[100px] text-right ml-2">
                                            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${item.is_late ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                                                {item.status_waktu}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Kolom Kanan: Box QR Code */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-4">
                        Pindai Cepat
                    </span>
                    <h2 className="text-xl font-black text-slate-800 mb-1">Pindai QR Code</h2>
                    <p className="text-xs text-slate-400 mb-6 font-medium">Arahkan kamera mobile ke kode di bawah</p>

                    <div className="p-5 bg-white border-2 border-dashed border-indigo-200 rounded-3xl shadow-sm mb-5">
                        {qrToken ? (
                            <QRCodeSVG value={qrToken} size={220} level="M" includeMargin={true} />
                        ) : (
                            <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-400 text-xs font-medium">
                                Menyiapkan QR...
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-slate-50 px-4 py-2 rounded-full">
                        <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                        <span>Berganti dalam: <strong className="text-indigo-600 text-sm ml-1">{countdown}s</strong></span>
                    </div>

                    <div className="w-full mt-6 pt-5 border-t border-slate-100 text-left space-y-3">
                        <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Khusus Peserta Magang Aktif</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Wajib Berada di Radius Kantor</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}