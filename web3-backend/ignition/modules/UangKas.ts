import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("UangKasModule", (m) => {
  // Memberitahu Hardhat untuk mendeploy kontrak bernama "UangKas"
  const uangKas = m.contract("UangKas");

  return { uangKas };
});