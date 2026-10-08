enum ScienceCalibrationPoint {
    //% block="first"
    First = 0,
    //% block="second"
    Second = 1
}
namespace scienceWeather {
    /** a-005: NTC 10kΩ/B3950, with 10kΩ lower resistor. Use 3.3V analog G/V/S. Module resistor orientation must match. Disconnected/rail reading=-127. */
    //% blockId=science_ntc block="NTC temperature pin $pin (°C)" group="NTC" pin.defl=ScienceAnalogPin.P1
    export function ntc(pin: ScienceAnalogPin): number {
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return -127
        let resistance = 10000 * (1023 / raw - 1)
        return 1 / (1 / 298.15 + Math.log(resistance / 10000) / 3950) - 273.15
    }
    let ptPins: number[] = []
    let ptRaw1: number[] = []
    let ptRaw2: number[] = []
    let ptTemp1: number[] = []
    let ptTemp2: number[] = []
    /** a-001 PT100 module: capture two known reference temperatures in the range of your experiment. Calibration resets when the program restarts. */
    //% blockId=science_pt100_calibrate block="PT100 pin $pin calibrate $point reference $temperature °C" group="PT100"
    //% pin.defl=ScienceAnalogPin.P1 temperature.defl=25
    export function calibratePT100(pin: ScienceAnalogPin, point: ScienceCalibrationPoint, temperature: number): void {
        if (!scienceInternal.finite(temperature)) return
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return
        let index = ptPins.indexOf(pin)
        if (index < 0) {
            index = ptPins.length; ptPins.push(pin)
            ptRaw1.push(-1); ptRaw2.push(-1); ptTemp1.push(0); ptTemp2.push(0)
        }
        if (point == ScienceCalibrationPoint.First) { ptRaw1[index] = raw; ptTemp1[index] = temperature }
        else { ptRaw2[index] = raw; ptTemp2[index] = temperature }
    }
    /** PT100 analog module: first calibrate at two known temperatures. Linear estimate only within those points; unavailable/out-of-range=-9999 °C. */
    //% blockId=science_pt100 block="PT100 temperature pin $pin (°C)" group="PT100" pin.defl=ScienceAnalogPin.P1
    export function pt100(pin: ScienceAnalogPin): number {
        let index = ptPins.indexOf(pin)
        if (index < 0 || ptRaw1[index] < 0 || ptRaw2[index] < 0 || Math.abs(ptRaw2[index] - ptRaw1[index]) < 5) return -9999
        let raw = scienceInternal.analog(pin)
        if (raw < Math.min(ptRaw1[index], ptRaw2[index]) || raw > Math.max(ptRaw1[index], ptRaw2[index])) return -9999
        return ptTemp1[index] + (raw - ptRaw1[index]) * (ptTemp2[index] - ptTemp1[index]) / (ptRaw2[index] - ptRaw1[index])
    }
}
namespace scienceWater {
    let phPins: number[] = []
    let ph7: number[] = []
    let ph4: number[] = []
    /** pH analog module: immerse in pH 7 or pH 4 buffer, wait until stable, then capture. Calibration is kept until reset. */
    //% blockId=science_ph_calibrate block="pH pin $pin calibrate buffer $reference" group="pH"
    //% pin.defl=ScienceAnalogPin.P1 reference.defl=7
    export function calibratePH(pin: ScienceAnalogPin, reference: number): void {
        if (reference != 7 && reference != 4) return
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return
        let index = phPins.indexOf(pin)
        if (index < 0) { index = phPins.length; phPins.push(pin); ph7.push(-1); ph4.push(-1) }
        if (reference == 7) ph7[index] = raw
        else ph4[index] = raw
    }
    /** a-009/010: 3.3V analog port. Calibrate with pH7 and pH4 buffers first. Failed/un-calibrated=-1; analog disconnection cannot be reliably detected. */
    //% blockId=science_ph block="pH pin $pin value" group="pH" pin.defl=ScienceAnalogPin.P1
    export function ph(pin: ScienceAnalogPin): number {
        let index = phPins.indexOf(pin)
        if (index < 0 || ph7[index] < 0 || ph4[index] < 0 || Math.abs(ph4[index] - ph7[index]) < 5) return -1
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return -1
        let value = 7 - 3 * (raw - ph7[index]) / (ph4[index] - ph7[index])
        return value >= 0 && value <= 14 ? value : -1
    }
    /** a-011/012, Gravity-compatible TDS module: 3.3V analog input. Estimated TDS ppm at measured water temperature; not electrical conductivity. Invalid=-1. */
    //% blockId=science_tds block="TDS pin $pin water temperature $temperature °C (ppm)" group="TDS"
    //% pin.defl=ScienceAnalogPin.P1 temperature.defl=25
    export function tds(pin: ScienceAnalogPin, temperature: number): number {
        if (!scienceInternal.finite(temperature) || temperature < 0 || temperature > 80) return -1
        let raw = scienceInternal.analog(pin)
        if (raw < 0 || raw >= 1023) return -1
        let voltage = raw * 3.3 / 1023
        let compensated = voltage / (1 + 0.02 * (temperature - 25))
        let value = (133.42 * compensated * compensated * compensated - 255.86 * compensated * compensated + 857.39 * compensated) * 0.5
        return scienceInternal.finite(value) && value >= 0 ? value : -1
    }
}
//% color=#A77925 weight=65 block="Electrical measurements"
//% groups='["Current","External ADC"]'
namespace scienceElectric {
    let currentPins: number[] = []
    let currentZeros: number[] = []
    let currentCountsPerAmp: number[] = []
    /** a-032 WCS2801: power from 3.3V. Disconnect measured current before zeroing; zero calibration is lost on restart. */
    //% blockId=science_current_zero block="zero current sensor pin $pin" group="Current" pin.defl=ScienceAnalogPin.P1
    export function zeroCurrent(pin: ScienceAnalogPin): void {
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return
        let index = currentPins.indexOf(pin)
        if (index < 0) { currentPins.push(pin); currentZeros.push(raw); currentCountsPerAmp.push(0) }
        else currentZeros[index] = raw
    }
    /** After zeroing, apply a known DC current measured by a reference meter. Sensitivity varies with supply voltage and module. */
    //% blockId=science_current_calibrate block="current pin $pin calibrate reference $amps A" group="Current"
    //% pin.defl=ScienceAnalogPin.P1 amps.defl=0.5
    export function calibrateCurrent(pin: ScienceAnalogPin, amps: number): void {
        let index = currentPins.indexOf(pin)
        if (index < 0 || !scienceInternal.finite(amps) || Math.abs(amps) < 0.05 || Math.abs(amps) > 1) return
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023 || Math.abs(raw - currentZeros[index]) < 5) return
        currentCountsPerAmp[index] = (raw - currentZeros[index]) / amps
    }
    /** WCS2801 1A module, 3.3V supply. Zero and calibrate with a known current first. Failure/outside ±1A=-9999. */
    //% blockId=science_current block="current sensor pin $pin (A)" group="Current" pin.defl=ScienceAnalogPin.P1
    export function current(pin: ScienceAnalogPin): number {
        let index = currentPins.indexOf(pin)
        if (index < 0 || currentCountsPerAmp[index] == 0) return -9999
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return -9999
        let amps = (raw - currentZeros[index]) / currentCountsPerAmp[index]
        return Math.abs(amps) <= 1 ? amps : -9999
    }
}
