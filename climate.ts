enum ScienceClimateValue {
    //% block="temperature (°C)"
    Temperature = 0,
    //% block="humidity (%)"
    Humidity = 1
}
enum SciencePressureValue {
    //% block="pressure (hPa)"
    Pressure = 0,
    //% block="temperature (°C)"
    Temperature = 1,
    //% block="estimated altitude (m)"
    Altitude = 2
}
enum ScienceIRTemperature {
    //% block="object"
    Object = 0,
    //% block="ambient"
    Ambient = 1
}

//% color=#DD7045 weight=85 block="Temperature and weather"
//% groups='["Temperature and humidity(GXHT30/SHT30/SHT31)","Temperature and humidity(DHT11/22)","Temperature(NTC)","Temperature(PT100)","Air pressure(BMP280)","Infrared temperature(MLX90614)","Clock(DS1307)"]'
namespace scienceWeather {
    let shtAt = -1000
    let shtTemp = -127
    let shtHumidity = -1
    /** i2c-002: GXHT30/SHT30/SHT31 at I2C 0x44. Shared single-shot command, CRC and conversion verified in GXHT30 datasheet sections 7.3/7.11/7.12. Failed temperature=-127, humidity=-1. */
    //% blockId=science_sht31 block="I2C temperature and humidity $value" group="Temperature and humidity(GXHT30/SHT30/SHT31)"
    export function sht31(value: ScienceClimateValue): number {
        scienceBus.acquire()
        if (control.millis() - shtAt >= 100) {
            shtTemp = -127
            shtHumidity = -1
            // GXHT30 and SHT3x high-repeatability single shot (no clock stretching).
            if (scienceBus.write(0x44, [0x24, 0x00])) {
                basic.pause(16)
                let data = scienceBus.read(0x44, 6)
                if (data && scienceBus.crc8(data, 0, 2, 255, 0x31) == data[2] &&
                    scienceBus.crc8(data, 3, 2, 255, 0x31) == data[5]) {
                    shtTemp = -45 + 175 * scienceBus.be16(data, 0) / 65535
                    shtHumidity = 100 * scienceBus.be16(data, 3) / 65535
                }
            }
            shtAt = control.millis()
        }
        let result = value == ScienceClimateValue.Temperature ? shtTemp : shtHumidity
        scienceBus.release()
        return result
    }

    let bmpAddress = 0
    let bmpCalibration: Buffer = null
    let bmpAt = -1000
    let bmpTemp = -127
    let bmpPressure = -1
    let bmpSeaLevel = 1013.25
    /** Set the local sea-level pressure (QNH), not unadjusted station pressure. Affects altitude only. Default 1013.25 hPa is a standard-atmosphere estimate; setting is lost on restart. */
    //% blockId=science_bmp_sealevel block="BMP280 altitude sea-level pressure $hpa hPa" group="Air pressure(BMP280)"
    //% hpa.defl=1013.25 hpa.min=850 hpa.max=1100
    export function setSeaLevelPressure(hpa: number): void {
        bmpSeaLevel = scienceInternal.finite(hpa) && hpa >= 850 && hpa <= 1100 ? hpa : 0
    }
    // Bosch floating-point compensation, preserved from the BRIXEL BMP280 driver.
    function bmpInit(): boolean {
        for (let address = 0x76; address <= 0x77; address++) {
            let id = scienceBus.register(address, 0xD0, 1)
            if (!id || id[0] != 0x58) continue
            if (!scienceBus.write(address, [0xE0, 0xB6])) continue
            basic.pause(5)
            let cal = scienceBus.register(address, 0x88, 24)
            if (!cal || scienceBus.u16(cal, 0) == 0 || scienceBus.u16(cal, 0) == 65535 ||
                scienceBus.u16(cal, 6) == 0 || scienceBus.u16(cal, 6) == 65535) continue
            if (!scienceBus.write(address, [0xF4, 0x3F])) continue
            bmpAddress = address
            bmpCalibration = cal
            basic.pause(100)
            return true
        }
        return false
    }
    export function compensateBMP(cal: Buffer, adcT: number, adcP: number): number[] {
        let t1 = scienceBus.u16(cal, 0)
        let t2 = scienceBus.s16(cal, 2)
        let t3 = scienceBus.s16(cal, 4)
        let v1 = (adcT / 16384 - t1 / 1024) * t2
        let d = adcT / 131072 - t1 / 8192
        let fine = v1 + d * d * t3
        let temperature = fine / 5120
        v1 = fine / 2 - 64000
        let v2 = v1 * v1 * scienceBus.s16(cal, 16) / 32768
        v2 += v1 * scienceBus.s16(cal, 14) * 2
        v2 = v2 / 4 + scienceBus.s16(cal, 12) * 65536
        v1 = (scienceBus.s16(cal, 10) * v1 * v1 / 524288 + scienceBus.s16(cal, 8) * v1) / 524288
        v1 = (1 + v1 / 32768) * scienceBus.u16(cal, 6)
        if (v1 == 0) return [-127, -1]
        let pressure = ((1048576 - adcP) - v2 / 4096) * 6250 / v1
        v1 = scienceBus.s16(cal, 22) * pressure * pressure / 2147483648
        v2 = pressure * scienceBus.s16(cal, 20) / 32768
        pressure = (pressure + (v1 + v2 + scienceBus.s16(cal, 18)) / 16) / 100
        if (!scienceInternal.finite(temperature) || !scienceInternal.finite(pressure) ||
            temperature < -40 || temperature > 85 || pressure < 300 || pressure > 1100) return [-127, -1]
        return [temperature, pressure]
    }
    /** i2c-006: connect BMP280 to I2C. Altitude uses your sea-level pressure setting, default 1013.25 hPa. Weather changes affect altitude. Failures: -127 °C, -1 hPa, -9999 m. */
    //% blockId=science_bmp280 block="BMP280 $value" group="Air pressure(BMP280)"
    export function bmp280(value: SciencePressureValue): number {
        scienceBus.acquire()
        if (control.millis() - bmpAt >= 100) {
            bmpTemp = -127
            bmpPressure = -1
            if (bmpAddress != 0 || bmpInit()) {
                let data = scienceBus.register(bmpAddress, 0xF7, 6)
                if (data) {
                    let rawP = data[0] * 4096 + data[1] * 16 + (data[2] >> 4)
                    let rawT = data[3] * 4096 + data[4] * 16 + (data[5] >> 4)
                    if (rawT != 0x80000 && rawP != 0x80000) {
                        let pair = compensateBMP(bmpCalibration, rawT, rawP)
                        bmpTemp = pair[0]
                        bmpPressure = pair[1]
                    }
                } else bmpAddress = 0
            }
            bmpAt = control.millis()
        }
        let result = bmpPressure
        if (value == SciencePressureValue.Temperature) result = bmpTemp
        if (value == SciencePressureValue.Altitude) result = bmpPressure < 0 || bmpSeaLevel <= 0 ? -9999 : 44330 * (1 - Math.pow(bmpPressure / bmpSeaLevel, 0.1903))
        scienceBus.release()
        return result
    }

    /** i2c-003: connect MLX90614 to I2C. Do not combine with CCS811 at address 0x5A. Failed read or PEC returns -127 °C. */
    //% blockId=science_mlx90614 block="infrared temperature $source (°C)" group="Infrared temperature(MLX90614)"
    export function infraredTemperature(source: ScienceIRTemperature): number {
        scienceBus.acquire()
        let register = source == ScienceIRTemperature.Object ? 7 : 6
        let data = scienceBus.register(0x5A, register, 3)
        let result = -127
        if (data) {
            // SMBus PEC includes both address bytes and the command, not only the data bytes.
            let frame = pins.createBufferFromArray([0xB4, register, 0xB5, data[0], data[1]])
            let raw = scienceBus.u16(data, 0)
            if (scienceBus.crc8(frame, 0, 5, 0, 7) == data[2] && (raw & 0x8000) == 0 && raw != 0) {
                let temperature = raw * 0.02 - 273.15
                if (temperature >= -70 && temperature <= 380) result = temperature
            }
        }
        scienceBus.release()
        return result
    }
}
