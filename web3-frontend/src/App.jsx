import { useContext, useEffect, useState } from 'react';
import { Web3Context } from './context/Web3Context';
import { ethers } from 'ethers';

function App() {
  const { account, contract, connectWallet } = useContext(Web3Context);
  
  const [bendahara, setBendahara] = useState("");
  const [saldoKas, setSaldoKas] = useState("0");
  const [totalAnggota, setTotalAnggota] = useState("0");
  const [isMembayar, setIsMembayar] = useState(false);
  
  const [alamatBaru, setAlamatBaru] = useState("");
  const [isMenambah, setIsMenambah] = useState(false);

  const [tujuan, setTujuan] = useState("");
  const [jumlahDana, setJumlahDana] = useState("");
  const [penerima, setPenerima] = useState("");
  const [isMengajukan, setIsMengajukan] = useState(false);
  const [daftarProposal, setDaftarProposal] = useState([]);

  const ambilDataKas = async () => {
    if (contract) {
      try {
        setBendahara(await contract.bendahara());
        const jumlahAnggota = await contract.totalAnggota();
        setTotalAnggota(jumlahAnggota.toString());
        const saldo = await contract.cekSaldoKas();
        setSaldoKas(ethers.formatEther(saldo));

        let proposalTemp = [];
        let index = 0;
        while (true) {
          try {
            const prop = await contract.daftarProposal(index);
            proposalTemp.push({
              id: index,
              pengaju: prop.pengaju,
              tujuan: prop.tujuan,
              jumlahDana: ethers.formatEther(prop.jumlahDana),
              penerima: prop.penerima,
              jumlahSuaraSetuju: prop.jumlahSuaraSetuju.toString(),
              sudahCair: prop.sudahCair
            });
            index++;
          } catch (error) {
            break; 
          }
        }
        setDaftarProposal(proposalTemp);
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      }
    }
  };

  useEffect(() => {
    ambilDataKas();
  }, [contract]);

  const bayarIuran = async () => {
    if (contract) {
      try {
        setIsMembayar(true);
        const tx = await contract.bayarKas({ value: ethers.parseEther("0.01") });
        await tx.wait();
        alert("Pembayaran berhasil! 🎉");
        ambilDataKas(); 
      } catch (error) {
        alert("Transaksi gagal. Pastikan belum bayar dalam 30 hari terakhir.");
      } finally { setIsMembayar(false); }
    }
  };

  const tambahAnggotaBaru = async () => {
    if (!alamatBaru) return alert("Masukkan alamat dompet!");
    if (contract) {
      try {
        setIsMenambah(true);
        const tx = await contract.tambahAnggota(alamatBaru);
        await tx.wait();
        alert("Anggota baru berhasil ditambahkan!");
        setAlamatBaru(""); 
        ambilDataKas();
      } catch (error) {
        alert("Gagal! Pastikan kamu Bendahara dan alamat valid.");
      } finally { setIsMenambah(false); }
    }
  };

  const ajukanProposal = async () => {
    if (!tujuan || !jumlahDana || !penerima) return alert("Isi semua data proposal!");
    if (contract) {
      try {
        setIsMengajukan(true);
        const tx = await contract.ajukanPengeluaran(tujuan, ethers.parseEther(jumlahDana), penerima);
        await tx.wait();
        alert("Proposal berhasil diajukan! 📝");
        setTujuan(""); setJumlahDana(""); setPenerima("");
        ambilDataKas(); 
      } catch (error) {
        alert("Gagal! Pastikan dana kas cukup dan kamu adalah anggota.");
      } finally { setIsMengajukan(false); }
    }
  };

  // --- FUNGSI BARU: MEMBERIKAN SUARA (VOTE) ---
  const voteProposal = async (id) => {
    if (contract) {
      try {
        const tx = await contract.berikanSuara(id);
        await tx.wait();
        alert("Suara berhasil diberikan! 👍");
        ambilDataKas(); // Refresh jumlah vote
      } catch (error) {
        console.error("Gagal vote:", error);
        alert("Gagal vote. Pastikan kamu anggota dan belum vote di proposal ini.");
      }
    }
  };

  // --- FUNGSI BARU: MENCairKAN DANA ---
  const cairkanProposal = async (id) => {
    if (contract) {
      try {
        const tx = await contract.cairkanDana(id);
        await tx.wait();
        alert("Dana berhasil dicairkan ke penerima! 💸");
        ambilDataKas(); // Refresh saldo kas dan status proposal
      } catch (error) {
        console.error("Gagal cairkan:", error);
        alert("Gagal mencairkan. Pastikan suara setuju > 50% dan dana kas mencukupi.");
      }
    }
  };

  const isBendahara = account && bendahara && account.toLowerCase() === bendahara.toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl text-center border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">DApp Uang Kas</h1>
        <p className="text-gray-500 mb-8">Sistem Transparan Berbasis Blockchain</p>
        
        {account ? (
          <div className="animate-fade-in space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4 text-left">
              <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-inner">
                <p className="text-sm text-gray-600">Saldo Kas Kelas</p>
                <p className="text-2xl font-bold text-blue-700">{saldoKas} ETH</p>
                <p className="text-xs text-gray-500 mt-1">Total: {totalAnggota} Anggota</p>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <button onClick={bayarIuran} disabled={isMembayar} className={`w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg ${isMembayar ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-green-500/30'}`}>
                  {isMembayar ? "⏳ Memproses..." : "💸 Bayar Kas (0.01 ETH)"}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-left">
              <h3 className="font-bold text-gray-800 mb-3">📝 Ajukan Pengeluaran Baru</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Tujuan (Contoh: Beli Spidol)" value={tujuan} onChange={(e) => setTujuan(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                <div className="flex gap-3">
                  <input type="number" placeholder="Jumlah (ETH)" value={jumlahDana} onChange={(e) => setJumlahDana(e.target.value)} className="w-1/3 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  <input type="text" placeholder="Alamat Dompet Penerima (0x...)" value={penerima} onChange={(e) => setPenerima(e.target.value)} className="w-2/3 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" />
                </div>
                <button onClick={ajukanProposal} disabled={isMengajukan} className={`w-full font-bold py-2 rounded-lg transition-all ${isMengajukan ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {isMengajukan ? "⏳ Mengirim..." : "Kirim Proposal"}
                </button>
              </div>
            </div>

            <div className="text-left mt-6">
              <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">Daftar Proposal Aktif</h3>
              {daftarProposal.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Belum ada proposal yang diajukan.</p>
              ) : (
                <div className="space-y-4">
                  {daftarProposal.map((prop) => (
                    <div key={prop.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-800 text-lg">{prop.tujuan}</h4>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${prop.sudahCair ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                          {prop.sudahCair ? "Selesai ✅" : "Pending ⏳"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Dana: <span className="font-bold text-blue-600">{prop.jumlahDana} ETH</span></p>
                      <p className="text-xs text-gray-400 font-mono break-all mb-4 bg-gray-50 p-2 rounded">Ke: {prop.penerima}</p>
                      
                      <div className="flex items-center justify-between mb-3 border-b pb-3 border-gray-100">
                         <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                           <span>👍 Suara Setuju:</span> 
                           <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{prop.jumlahSuaraSetuju} / {totalAnggota}</span>
                         </span>
                      </div>

                      {/* --- TOMBOL VOTE & CAIRKAN DITAMPILKAN JIKA BELUM CAIR --- */}
                      {!prop.sudahCair && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => voteProposal(prop.id)} 
                            className="flex-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold py-2 px-4 rounded-lg transition-all text-sm border border-blue-200 hover:border-transparent"
                          >
                            👍 Berikan Suara
                          </button>
                          <button 
                            onClick={() => cairkanProposal(prop.id)} 
                            className="flex-1 bg-green-50 hover:bg-green-600 hover:text-white text-green-700 font-bold py-2 px-4 rounded-lg transition-all text-sm border border-green-200 hover:border-transparent"
                          >
                            💸 Cairkan Dana
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isBendahara && (
              <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-200 text-left">
                <h3 className="font-bold text-gray-800 mb-2">👑 Panel Admin (Bendahara)</h3>
                <div className="flex flex-col space-y-3">
                  <input type="text" placeholder="Alamat Anggota Baru (0x...)" value={alamatBaru} onChange={(e) => setAlamatBaru(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none font-mono text-sm" />
                  <button onClick={tambahAnggotaBaru} disabled={isMenambah} className={`w-full font-bold py-2 px-4 rounded-lg transition-all ${isMenambah ? 'bg-gray-400' : 'bg-gray-800 hover:bg-black text-white'}`}>
                    {isMenambah ? "⏳ Mendaftarkan..." : "➕ Tambah Anggota"}
                  </button>
                </div>
              </div>
            )}

          </div>
        ) : (
          <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl w-full shadow-lg">
            🦊 Hubungkan MetaMask
          </button>
        )}
      </div>
    </div>
  );
}

export default App;