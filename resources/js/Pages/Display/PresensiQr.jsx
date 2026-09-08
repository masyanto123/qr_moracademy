import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";
import { Clock, RefreshCw, Users, CheckCircle2 } from "lucide-react";

export default function PresensiQr() {
    const [qrToken, setQrToken] = useState("");
    const [countdown, setCountdown] = useState(20);
    const [attendances, setAttendances] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchToken = async () => {
        try {
            const res = await axios.get("/api/qr-token");
            setQrToken(res.data.token);
            setCountdown(20);
        } catch (err) {
            console.error("Gagal load QR Token", err);
        }
    };

    const fetchAttendance = async () => {
        try {
            const res = await axios.get("/api/today-attendance");
            setAttendances(res.data.data);
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
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-200 pb-5 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-indigo-950">
                        MORACADEMY <span className="text-indigo-600 font-normal">| Presensi Harian</span>
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Pindai QR Code menggunakan aplikasi mobile peserta magang.
                    </p>
                </div>
                <div className="text-right mt-4 md:mt-0">
                    <div className="text-3xl md:text-4xl font-mono font-bold text-slate-800">
                        {currentTime.toLocaleTimeString("id-ID")}
                    </div>
                    <div className="text-sm font-medium text-slate-500">
                        {currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                </div>
            </div>

            {/* Grid Konten */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
                {/* List Kehadiran Hari Ini */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[550px]">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-800">Daftar Kehadiran Hari Ini</h2>
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-full text-xs">
                            {attendances.length} Hadir
                        </span>
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                        {attendances.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Clock className="w-10 h-10 mb-2 text-slate-300" />
                                <p className="text-sm">Belum ada peserta yang presensi hari ini.</p>
                            </div>
                        ) : (
                            attendances.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                            {item.nama.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">{item.nama}</h3>
                                            <p className="text-xs text-slate-500">NIM/NIS: {item.nim_nis}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-semibold text-slate-700">{item.jam_masuk}</span>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.is_late ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                                            {item.status_waktu}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Box QR Code */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-xs font-bold tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3">
                        Pindai Cepat
                    </span>
                    <h2 className="text-xl font-bold text-slate-800 mb-1">Pindai QR Code</h2>
                    <p className="text-xs text-slate-400 mb-6">Arahkan kamera aplikasi mobile ke kode di bawah</p>

                    <div className="p-4 bg-white border-2 border-dashed border-indigo-200 rounded-2xl shadow-sm mb-4">
                        {qrToken ? (
                            <QRCodeSVG value={qrToken} size={210} level="M" includeMargin={true} />
                        ) : (
                            <div className="w-[210px] h-[210px] flex items-center justify-center text-slate-400 text-xs">
                                Menyiapkan QR...
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                        <span>Berganti dalam: <strong className="text-indigo-600">{countdown}s</strong></span>
                    </div>

                    <div className="w-full mt-6 pt-4 border-t border-slate-100 text-left space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Khusus Peserta Magang Aktif</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}