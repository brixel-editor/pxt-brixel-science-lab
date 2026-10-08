enum ScienceADCChannel {
    //% block="A0"
    A0 = 0,
    //% block="A1"
    A1 = 1,
    //% block="A2"
    A2 = 2,
    //% block="A3"
    A3 = 3
}
enum ScienceADCAddress {
    //% block="0x48"
    Address48 = 0x48,
    //% block="0x49"
    Address49 = 0x49,
    //% block="0x4A"
    Address4A = 0x4A,
    //% block="0x4B"
    Address4B = 0x4B
}
namespace scienceADC {
    export let address = 0x48
    export let clearWater = [0, 0, 0, 0]
    export let voltageScale = [0, 0, 0, 0]
    export function valid(channel: number): boolean { return channel >= 0 && channel <= 3 && channel == Math.floor(channel) }
    // ADS1115, single-ended, single-shot, ±6.144V PGA, 128SPS, comparator off.
    export function volts(channel: number): number {
        if (!valid(channel)) return -1
        scienceBus.acquire()
        let config = 0x8183 | ((4 + channel) << 12)
        let result = -1
        if (scienceBus.write(address, [1, config >> 8, config & 255])) {
            let start = control.millis()
            // Wait a full 128SPS conversion period before inspecting OS.
            basic.pause(9)
            while (control.millis() - start < 30) {
                let status = scienceBus.register(address, 1, 2)
                if (!status || (scienceBus.be16(status, 0) & 0x7FFF) != (config & 0x7FFF)) break
                if (status[0] & 128) {
                    let sample = scienceBus.register(address, 0, 2)
                    if (sample) {
                        let raw = scienceBus.signedBE(sample, 0)
                        let voltage = raw * 6.144 / 32768
                        if (raw >= 0 && raw < 32767 && voltage <= 5.0) result = voltage
                    }
                    break
                }
                basic.pause(1)
            }
        }
        scienceBus.release()
        return result
    }
}
namespace scienceElectric {
    /** Optional external ADS1115 only: 5V supply and bidirectional I2C level shifter to micro:bit. Channels A0..A3 are on ADS1115, not shield labels. Address change clears calibration. */
    //% blockId=science_adc_address block="external ADS1115 address $address" group="External ADC(ADS1115)" advanced=true
    export function setADCAddress(address: ScienceADCAddress): void {
        if (address < 0x48 || address > 0x4B || address != Math.floor(address)) return
        scienceBus.acquire()
        if (scienceADC.address != address) {
            scienceADC.address = address
            scienceADC.clearWater = [0, 0, 0, 0]; scienceADC.voltageScale = [0, 0, 0, 0]
        }
        scienceBus.release()
    }
    /** 25V DC divider module into external ADS1115. Apply a known positive reference <=25V; ADC signal must stay within 0..5V and ADC supply. Calibration clears on restart/address change. */
    //% blockId=science_voltage_calibrate block="voltage sensor external ADC $channel calibrate at $voltage V" group="External ADC(ADS1115)"
    //% voltage.defl=5 voltage.min=0.1 voltage.max=25
    export function calibrateVoltage(channel: ScienceADCChannel, voltage: number): void {
        if (!scienceADC.valid(channel)) return
        scienceADC.voltageScale[channel] = 0
        if (!scienceInternal.finite(voltage) || voltage <= 0 || voltage > 25) return
        let sample = scienceADC.volts(channel)
        if (sample > 0.05) scienceADC.voltageScale[channel] = voltage / sample
    }
    /** Calibrated DC voltage from the divider through external ADS1115. Never wire measured voltage directly to ADS1115 or micro:bit. Not calibrated/read error/outside 0..25V=-1. */
    //% blockId=science_voltage block="voltage sensor external ADC $channel (V)" group="External ADC(ADS1115)"
    export function voltage(channel: ScienceADCChannel): number {
        if (!scienceADC.valid(channel) || scienceADC.voltageScale[channel] <= 0) return -1
        let sample = scienceADC.volts(channel)
        let result = sample * scienceADC.voltageScale[channel]
        return sample < 0 || result > 25 ? -1 : result
    }
}
namespace scienceWater {
    /** AZDM01 module through optional external ADS1115 (5V supply and I2C level shifting). Put in clear water and shield ambient light. Store actual clear-water signal; clears on restart/address change. */
    //% blockId=science_turbidity_calibrate block="turbidity sensor external ADC $channel calibrate clear water" group="Turbidity(AZDM01)"
    export function calibrateTurbidity(channel: ScienceADCChannel): void {
        if (!scienceADC.valid(channel)) return
        let sample = scienceADC.volts(channel)
        scienceADC.clearWater[channel] = sample >= 0.1 ? sample : 0
    }
    /** AZDM01 relative transmission: clear water=100%, lower values mean cloudier water. Not NTU. Read error, calibration missing, or over 120%=-1; ADC signal must remain within its supply. */
    //% blockId=science_turbidity block="turbidity sensor external ADC $channel transmission (%)" group="Turbidity(AZDM01)"
    export function turbidity(channel: ScienceADCChannel): number {
        if (!scienceADC.valid(channel) || scienceADC.clearWater[channel] <= 0) return -1
        let sample = scienceADC.volts(channel)
        let ratio = sample * 100 / scienceADC.clearWater[channel]
        return sample < 0 || ratio > 120 ? -1 : ratio
    }
}
