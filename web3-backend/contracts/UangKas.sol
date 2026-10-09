// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UangKas {
    // --- 1. VARIABEL STATE (Data yang disimpan permanen di Blockchain) ---
    address public bendahara;
    uint256 public constant IURAN_BULANAN = 0.01 ether; // Simulasi Rp15.000 kita
    uint256 public totalAnggota;

    // Mapping ini seperti HashMap di Java, untuk mengecek data anggota
    mapping(address => bool) public isAnggota;
    mapping(address => uint256) public waktuBayarTerakhir;

    // --- 2. MODIFIER (Aturan pembatasan akses) ---
    modifier hanyaBendahara() {
        require(msg.sender == bendahara, "Ditolak: Anda bukan Bendahara!");
        _; // Lanjut eksekusi kode jika syarat di atas terpenuhi
    }

    modifier hanyaAnggota() {
        require(
            isAnggota[msg.sender],
            "Ditolak: Anda belum terdaftar sebagai anggota!"
        );
        _;
    }

    // --- 3. CONSTRUCTOR (Dijalankan sekali saat kontrak pertama kali di-deploy) ---
    constructor() {
        bendahara = msg.sender; // Akun yang deploy otomatis jadi Bendahara
        isAnggota[bendahara] = true;
        totalAnggota = 1;
    }

    // --- 4. FUNGSI PENDAFTARAN & KEUANGAN ---

    // Fungsi untuk mendaftarkan akun anggota baru ke dalam sistem
    function tambahAnggota(address _anggotaBaru) public hanyaBendahara {
        require(!isAnggota[_anggotaBaru], "Akun ini sudah menjadi anggota!");

        isAnggota[_anggotaBaru] = true;
        totalAnggota++;
    }

    // Fungsi untuk membayar kas bulanan
    function bayarKas() public payable hanyaAnggota {
        // Syarat 1: Uang yang dikirim harus pas 0.01 ETH
        require(
            msg.value == IURAN_BULANAN,
            "Nominal bayar harus pas 0.01 ETH!"
        );

        // Syarat 2: Harus sudah lewat 30 hari dari pembayaran terakhir
        require(
            block.timestamp >= waktuBayarTerakhir[msg.sender] + 30 days,
            "Belum 30 hari sejak bayar terakhir!"
        );

        // Update catatan waktu pembayaran akun tersebut
        waktuBayarTerakhir[msg.sender] = block.timestamp;
    }

    // Fungsi untuk mengecek total uang yang ada di dalam kotak kas (Smart Contract)
    function cekSaldoKas() public view returns (uint256) {
        return address(this).balance;
    }

    // --- 5. STRUKTUR DATA PROPOSAL ---
    struct Proposal {
        address pengaju;
        string tujuan;
        uint256 jumlahDana;
        address payable penerima; // 'payable' agar alamat ini bisa menerima transfer ETH
        uint256 jumlahSuaraSetuju;
        bool sudahCair;
    }

    // Array untuk menyimpan semua proposal yang pernah dibuat
    Proposal[] public daftarProposal;

    // Mapping untuk mencatat siapa saja yang sudah vote di proposal tertentu
    // Format: ID Proposal => Alamat Anggota => Sudah Vote? (true/false)
    mapping(uint256 => mapping(address => bool)) public sudahVote;

    // --- 6. FUNGSI PENGAJUAN & VOTING ---

    // Fungsi untuk mengajukan pengeluaran uang kas
    function ajukanPengeluaran(
        string memory _tujuan,
        uint256 _jumlahDana,
        address payable _penerima
    ) public hanyaAnggota {
        require(
            _jumlahDana <= cekSaldoKas(),
            "Ditolak: Dana kas tidak mencukupi!"
        );

        // Menambahkan proposal baru ke dalam array
        daftarProposal.push(
            Proposal({
                pengaju: msg.sender,
                tujuan: _tujuan,
                jumlahDana: _jumlahDana,
                penerima: _penerima,
                jumlahSuaraSetuju: 0,
                sudahCair: false
            })
        );
    }

    // Fungsi untuk memberikan suara (vote) persetujuan
    function setujuiPengeluaran(uint256 _proposalIndex) public hanyaAnggota {
        require(
            _proposalIndex < daftarProposal.length,
            "Ditolak: Proposal tidak ditemukan!"
        );

        // Kita gunakan 'storage' karena kita ingin mengubah data asli di dalam blockchain
        Proposal storage proposal = daftarProposal[_proposalIndex];

        require(
            !proposal.sudahCair,
            "Ditolak: Dana proposal ini sudah dicairkan!"
        );
        require(
            !sudahVote[_proposalIndex][msg.sender],
            "Ditolak: Anda sudah memberikan suara untuk proposal ini!"
        );

        // Catat bahwa anggota ini sudah vote, lalu tambahkan jumlah suara setuju
        sudahVote[_proposalIndex][msg.sender] = true;
        proposal.jumlahSuaraSetuju++;
    }

    // Fungsi untuk mengeksekusi pencairan dana
    // Siapa saja boleh menekan tombol ini, asalkan syarat mayoritas terpenuhi
    function cairkanDana(uint256 _proposalIndex) public {
        require(
            _proposalIndex < daftarProposal.length,
            "Ditolak: Proposal tidak ditemukan!"
        );
        Proposal storage proposal = daftarProposal[_proposalIndex];

        require(
            !proposal.sudahCair,
            "Ditolak: Dana proposal ini sudah dicairkan sebelumnya!"
        );

        // LOGIKA KONSENSUS: Harus lebih dari 50% anggota yang setuju
        require(
            proposal.jumlahSuaraSetuju > (totalAnggota / 2),
            "Ditolak: Suara mayoritas belum tercapai!"
        );
        require(
            cekSaldoKas() >= proposal.jumlahDana,
            "Ditolak: Saldo kas tidak cukup!"
        );

        // PENTING: Ubah status menjadi 'sudahCair' DULU sebelum mentransfer uang.
        // Ini untuk mencegah celah keamanan bernama 'Re-entrancy Attack'.
        proposal.sudahCair = true;

        // Proses transfer koin ETH asli ke alamat penerima
        proposal.penerima.transfer(proposal.jumlahDana);
    }
}
