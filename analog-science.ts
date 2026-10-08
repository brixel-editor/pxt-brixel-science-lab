enum ScienceCalibrationPoint {
    //% block="first"
    First = 0,
    //% block="second"
    Second = 1
}
namespace scienceWeather {
    let ntcPins: number[] = []
    let ntcR25: number[] = []
    /** Capture a stable reference thermometer reading. One-point R25 correction for the documented B3950 divider only; not a B-value or wiring correction. Lost on restart. Failed capture invalidates this pin until recalibrated. */
    //% blockId=science_ntc_calibrate block="NTC pin $pin calibrate reference $temperature °C" group="Temperature(NTC)"
    //% pin.defl=ScienceAnalogPin.P1 temperature.defl=25 temperature.min=-20 temperature.max=100
    export function calibrateNTC(pin: ScienceAnalogPin, temperature: number): void {
        let index = ntcPins.indexOf(pin)
        if (index < 0) { index = ntcPins.length; ntcPins.push(pin); ntcR25.push(0) }
        ntcR25[index] = 0
        if (!scienceInternal.finite(temperature) || temperature < -20 || temperature > 100) return
        let raw = scienceInternal.calibrationAnalog(pin)
        if (raw <= 0 || raw >= 1023) return
        let r25 = 10000 * (1023 / raw - 1) / Math.exp(3950 * (1 / (temperature + 273.15) - 1 / 298.15))
        if (r25 >= 5000 && r25 <= 20000) ntcR25[index] = r25
    }
    /** a-005: NTC 10kΩ/B3950, with 10kΩ lower resistor. Use 3.3V analog G/V/S. Module resistor orientation must match. Disconnected/rail reading=-127. */
    //% blockId=science_ntc block="NTC temperature pin $pin (°C)" group="Temperature(NTC)" pin.defl=ScienceAnalogPin.P1
    export function ntc(pin: ScienceAnalogPin): number {
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return -127
        let resistance = 10000 * (1023 / raw - 1)
        let index = ntcPins.indexOf(pin)
        let r25 = index < 0 ? 10000 : ntcR25[index]
        if (r25 <= 0) return -127
        return 1 / (1 / 298.15 + Math.log(resistance / r25) / 3950) - 273.15
    }
    let ptPins: number[] = []
    let ptRaw1: number[] = []
    let ptRaw2: number[] = []
    let ptTemp1: number[] = []
    let ptTemp2: number[] = []
    /** a-001 PT100 module: capture first, then second reference, at least 1 C and 5 ADC counts apart. A new first point clears the second; failed capture invalidates its point. Lost on restart. */
    //% blockId=science_pt100_calibrate block="PT100 pin $pin calibrate $point reference $temperature °C" group="Temperature(PT100)"
    //% pin.defl=ScienceAnalogPin.P1 temperature.defl=25
    export function calibratePT100(pin: ScienceAnalogPin, point: ScienceCalibrationPoint, temperature: number): void {
        let index = ptPins.indexOf(pin)
        if (index < 0) {
            index = ptPins.length; ptPins.push(pin)
            ptRaw1.push(-1); ptRaw2.push(-1); ptTemp1.push(0); ptTemp2.push(0)
        }
        if (point == ScienceCalibrationPoint.First || (point != 0 && point != 1)) { ptRaw1[index] = -1; ptRaw2[index] = -1 }
        else ptRaw2[index] = -1
        if (!scienceInternal.finite(temperature) || temperature < -200 || temperature > 850 || (point != 0 && point != 1)) return
        let raw = scienceInternal.calibrationAnalog(pin)
        if (raw <= 0 || raw >= 1023) return
        if (point == ScienceCalibrationPoint.First) { ptRaw1[index] = raw; ptTemp1[index] = temperature }
        else { ptRaw2[index] = raw; ptTemp2[index] = temperature }
    }
    /** PT100 analog module: first calibrate at two known temperatures. Linear estimate only within those points; unavailable/out-of-range=-9999 °C. */
    //% blockId=science_pt100 block="PT100 temperature pin $pin (°C)" group="Temperature(PT100)" pin.defl=ScienceAnalogPin.P1
    export function pt100(pin: ScienceAnalogPin): number {
        let index = ptPins.indexOf(pin)
        if (index < 0 || ptRaw1[index] < 0 || ptRaw2[index] < 0 || Math.abs(ptRaw2[index] - ptRaw1[index]) < 5 || Math.abs(ptTemp2[index] - ptTemp1[index]) < 1) return -9999
        let raw = scienceInternal.analog(pin)
        if (raw < Math.min(ptRaw1[index], ptRaw2[index]) || raw > Math.max(ptRaw1[index], ptRaw2[index])) return -9999
        return ptTemp1[index] + (raw - ptRaw1[index]) * (ptTemp2[index] - ptTemp1[index]) / (ptRaw2[index] - ptRaw1[index])
    }
}
namespace scienceWater {
    let phPins: number[] = []
    let ph7: number[] = []
    let phOther: number[] = []
    let phReference: number[] = []
    /** Capture pH7 first, then pH4 for acidic experiments or pH10 for alkaline experiments. Wait until stable at the buffer's stated temperature. Calibration is lost on reset; failed captures invalidate the reference. */
    //% blockId=science_ph_calibrate block="pH pin $pin calibrate buffer $reference" group="pH"
    //% pin.defl=ScienceAnalogPin.P1 reference.defl=7
    export function calibratePH(pin: ScienceAnalogPin, reference: number): void {
        let index = phPins.indexOf(pin)
        if (index < 0) { index = phPins.length; phPins.push(pin); ph7.push(-1); phOther.push(-1); phReference.push(4) }
        if (reference == 7 || (reference != 7 && reference != 4 && reference != 10)) { ph7[index] = -1; phOther[index] = -1 }
        else phOther[index] = -1
        if (reference != 7 && reference != 4 && reference != 10) return
        let raw = scienceInternal.calibrationAnalog(pin)
        if (raw <= 0 || raw >= 1023) return
        if (reference == 7) ph7[index] = raw
        else { phOther[index] = raw; phReference[index] = reference }
    }
    /** 3.3V analog pH module. Calibrate pH7 then pH4 or pH10 first. Outside those buffers is extrapolation, requiring separate validation. Failed/un-calibrated=-1; analog disconnection cannot be reliably detected. */
    //% blockId=science_ph block="pH pin $pin value" group="pH" pin.defl=ScienceAnalogPin.P1
    export function ph(pin: ScienceAnalogPin): number {
        let index = phPins.indexOf(pin)
        if (index < 0 || ph7[index] < 0 || phOther[index] < 0 || Math.abs(phOther[index] - ph7[index]) < 5) return -1
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return -1
        let value = 7 + (phReference[index] - 7) * (raw - ph7[index]) / (phOther[index] - ph7[index])
        return value >= 0 && value <= 14 ? value : -1
    }
    let tdsPins: number[] = []
    let tdsGains: number[] = []
    function tdsEstimate(raw: number, temperature: number): number {
        if (!scienceInternal.finite(temperature) || temperature < 0 || temperature > 50 || raw < 0 || raw >= 1023) return -1
        let voltage = raw * 3.3 / 1023
        // Convert voltage to conductivity first, then compensate conductivity to 25 C.
        let value = (133.42 * voltage * voltage * voltage - 255.86 * voltage * voltage + 857.39 * voltage) * 0.5 / (1 + 0.02 * (temperature - 25))
        return scienceInternal.finite(value) && value >= 0 ? value : -1
    }
    /** Use a known TDS standard stated at 25 C (ppm on factor 0.5), with actual water temperature. Stable capture; calibrate again after restart. Not an EC unit. Wrong/unstable references clear prior calibration. */
    //% blockId=science_tds_calibrate block="TDS pin $pin calibrate standard $ppm ppm water temperature $temperature °C" group="TDS"
    //% pin.defl=ScienceAnalogPin.P1 ppm.defl=707 ppm.min=50 ppm.max=1000 temperature.defl=25 temperature.min=0 temperature.max=50
    export function calibrateTDS(pin: ScienceAnalogPin, ppm: number, temperature: number): void {
        let index = tdsPins.indexOf(pin)
        if (index < 0) { index = tdsPins.length; tdsPins.push(pin); tdsGains.push(0) }
        tdsGains[index] = 0
        if (!scienceInternal.finite(ppm) || ppm < 50 || ppm > 1000) return
        let estimate = tdsEstimate(scienceInternal.calibrationAnalog(pin), temperature)
        if (estimate <= 0) return
        let gain = ppm / estimate
        if (gain >= 0.25 && gain <= 4) tdsGains[index] = gain
    }
    /** Gravity-compatible TDS estimate at 25 C, using actual water temperature 0..50 C. Calibrate with a standard first. Not EC or a direct dissolved-mass measurement. Uncalibrated, invalid or above 1000ppm=-1. */
    //% blockId=science_tds block="TDS pin $pin water temperature $temperature °C (ppm)" group="TDS"
    //% pin.defl=ScienceAnalogPin.P1 temperature.defl=25
    export function tds(pin: ScienceAnalogPin, temperature: number): number {
        let index = tdsPins.indexOf(pin)
        if (index < 0 || tdsGains[index] <= 0) return -1
        let estimate = tdsEstimate(scienceInternal.analog(pin), temperature)
        if (estimate < 0) return -1
        let value = estimate * tdsGains[index]
        return value <= 1000 ? value : -1
    }
}
//% color=#A77925 weight=65 block="Electrical measurements"
//% groups='["Current(WCS2801)","Voltage"]'
namespace scienceElectric {
    let currentPins: number[] = []
    let currentZeros: number[] = []
    let currentCountsPerAmp: number[] = []
    /** a-032 WCS2801: power from 3.3V. Disconnect measured current before zeroing, then calibrate a known current again. A new zero clears the old sensitivity. Lost on restart. */
    //% blockId=science_current_zero block="zero current sensor pin $pin" group="Current(WCS2801)" pin.defl=ScienceAnalogPin.P1
    export function zeroCurrent(pin: ScienceAnalogPin): void {
        let index = currentPins.indexOf(pin)
        if (index < 0) { index = currentPins.length; currentPins.push(pin); currentZeros.push(-1); currentCountsPerAmp.push(0) }
        currentZeros[index] = -1; currentCountsPerAmp[index] = 0
        let raw = scienceInternal.calibrationAnalog(pin)
        if (raw > 0 && raw < 1023) currentZeros[index] = raw
    }
    /** After zeroing, apply a known DC current measured by a reference meter. Sensitivity varies with supply voltage and module. */
    //% blockId=science_current_calibrate block="current pin $pin calibrate reference $amps A" group="Current(WCS2801)"
    //% pin.defl=ScienceAnalogPin.P1 amps.defl=0.5
    export function calibrateCurrent(pin: ScienceAnalogPin, amps: number): void {
        let index = currentPins.indexOf(pin)
        if (index < 0) return
        currentCountsPerAmp[index] = 0
        if (currentZeros[index] < 0 || !scienceInternal.finite(amps) || Math.abs(amps) < 0.05 || Math.abs(amps) > 1) return
        let raw = scienceInternal.calibrationAnalog(pin)
        if (raw <= 0 || raw >= 1023 || Math.abs(raw - currentZeros[index]) < 5) return
        currentCountsPerAmp[index] = (raw - currentZeros[index]) / amps
    }
    /** WCS2801 1A module, 3.3V supply. Zero and calibrate with a known current first. Failure/outside ±1A=-9999. */
    //% blockId=science_current block="current sensor pin $pin (A)" group="Current(WCS2801)" pin.defl=ScienceAnalogPin.P1
    export function current(pin: ScienceAnalogPin): number {
        let index = currentPins.indexOf(pin)
        if (index < 0 || currentCountsPerAmp[index] == 0) return -9999
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return -9999
        let amps = (raw - currentZeros[index]) / currentCountsPerAmp[index]
        return Math.abs(amps) <= 1 ? amps : -9999
    }
}
