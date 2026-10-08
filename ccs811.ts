// Register sequence checked against SparkFun CCS811 (MIT); see SOURCES.md.
namespace scienceAir {
    let ccsAddress = 0
    let ccsWarmAt = 0
    let ccsAt = -10000
    let ccsPollAt = -1000
    let ccsCO2 = -1
    let ccsVOC = -1
    function ccsInvalidate(): void { ccsCO2 = -1; ccsVOC = -1; ccsAt = -10000; ccsAddress = 0 }
    function ccsInit(): boolean {
        for (let addr = 0x5A; addr <= 0x5B; addr++) {
            let id = scienceBus.register(addr, 0x20, 1)
            if (!id || id[0] != 0x81) continue
            // nWAKE must already be held LOW by the module/wiring.
            let status = scienceBus.register(addr, 0x00, 1)
            if (!status || !(status[0] & 0x10) || (status[0] & 1)) continue
            if (!(status[0] & 0x80)) {
                if (!scienceBus.write(addr, [0xF4])) continue
                basic.pause(10)
                status = scienceBus.register(addr, 0x00, 1)
                if (!status || !(status[0] & 0x80) || (status[0] & 1)) continue
            }
            if (!scienceBus.write(addr, [0x01, 0x10])) continue // IAQ drive mode 1, 1 second
            ccsAddress = addr
            ccsWarmAt = control.millis() + 1200000 // manufacturer run-in: 20 minutes after start
            return true
        }
        return false
    }
    /** CCS811 I2C air quality, address 0x5A/0x5B. Keep nWAKE LOW. First 20 minutes/errors=-1; eCO2 is an estimate. First-use burn-in is additional. */
    //% blockId=science_ccs811 block="CCS811 air quality $value" group="eCO2(CCS811)"
    export function ccs811(value: ScienceAirValue): number {
        if (value != ScienceAirValue.ECO2 && value != ScienceAirValue.TVOC) return -1
        scienceBus.acquire()
        if (control.millis() - ccsPollAt >= 100) {
            if (ccsAddress != 0 || ccsInit()) {
                let status = scienceBus.register(ccsAddress, 0, 1)
                if (!status || !(status[0] & 0x80) || (status[0] & 1)) {
                    if (status && (status[0] & 1)) scienceBus.register(ccsAddress, 0xE0, 1)
                    ccsInvalidate()
                } else if (status[0] & 8) {
                    let data = scienceBus.register(ccsAddress, 2, 8)
                    if (!data || (data[4] & 1) || data[5] != 0 || !(data[4] & 0x80)) ccsInvalidate()
                    else {
                        let co2 = scienceBus.be16(data, 0)
                        let voc = scienceBus.be16(data, 2)
                        if (co2 < 400 || co2 > 32768 || voc > 32768) ccsInvalidate()
                        else { ccsCO2 = co2; ccsVOC = voc; ccsAt = control.millis() }
                    }
                }
            }
            ccsPollAt = control.millis()
        }
        let result = -1
        if (ccsAddress != 0 && control.millis() >= ccsWarmAt && control.millis() - ccsAt <= 2500)
            result = value == ScienceAirValue.ECO2 ? ccsCO2 : ccsVOC
        scienceBus.release()
        return result
    }
}
