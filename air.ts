enum ScienceAirValue {
    //% block="equivalent CO2 (ppm)"
    ECO2 = 0,
    //% block="TVOC (ppb)"
    TVOC = 1
}
//% color=#657BA9 weight=70 block="Air quality"
//% groups='["SGP30","CCS811","Particulate matter","CO2 sensor"]'
namespace scienceAir {
    let sgpStarted = false
    let sgpReadyAt = 0
    let sgpValidAt = -10000
    let sgpCO2 = -1
    let sgpTVOC = -1
    let sgpInitialized = false
    function sgpSample(): void {
        scienceBus.acquire()
        // Keep the previous sample visible while a new conversion is in progress.
        // Commit failure markers only once the transaction actually fails.
        let nextCO2 = -1
        let nextTVOC = -1
        if (!sgpInitialized) {
            // Feature-set response with CRC identifies SGP30 before starting its IAQ algorithm.
            if (scienceBus.write(0x58, [0x20, 0x2F])) {
                basic.pause(10)
                let feature = scienceBus.read(0x58, 3)
                if (feature && scienceBus.crc8(feature, 0, 2, 255, 0x31) == feature[2] &&
                    (scienceBus.be16(feature, 0) & 0xF000) == 0 && scienceBus.write(0x58, [0x20, 0x03])) {
                    basic.pause(10)
                    sgpInitialized = true
                    sgpReadyAt = control.millis() + 15000
                }
            }
        } else if (scienceBus.write(0x58, [0x20, 0x08])) {
            basic.pause(12)
            let data = scienceBus.read(0x58, 6)
            if (data && scienceBus.crc8(data, 0, 2, 255, 0x31) == data[2] &&
                scienceBus.crc8(data, 3, 2, 255, 0x31) == data[5]) {
                if (control.millis() >= sgpReadyAt) {
                    nextCO2 = scienceBus.be16(data, 0)
                    nextTVOC = scienceBus.be16(data, 3)
                    sgpValidAt = control.millis()
                }
            } else sgpInitialized = false
        } else sgpInitialized = false
        sgpCO2 = nextCO2
        sgpTVOC = nextTVOC
        scienceBus.release()
    }
    /** i2c-004: connect SGP30 to I2C. It samples once per second in the background. First 15+ seconds and errors=-1. eCO2 is an estimate, not direct CO2 measurement. */
    //% blockId=science_sgp30 block="SGP30 air quality $value" group="SGP30"
    export function sgp30(value: ScienceAirValue): number {
        if (!sgpStarted) {
            sgpStarted = true
            control.inBackground(function () {
                while (true) {
                    let start = control.millis()
                    sgpSample()
                    basic.pause(Math.max(1, 1000 - (control.millis() - start)))
                }
            })
        }
        if (control.millis() - sgpValidAt > 2000) return -1
        return value == ScienceAirValue.ECO2 ? sgpCO2 : sgpTVOC
    }
}
