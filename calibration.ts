enum ScienceSoilReference {
    //% block="dry soil"
    Dry = 0,
    //% block="wet soil"
    Wet = 1
}
namespace scienceWater {
    let soilPins: number[] = []
    let soilDry: number[] = []
    let soilWet: number[] = []
    /** Capture dry soil first, then wet soil of the same type, depth and packing. Relative endpoints, not volumetric water content. Dry starts a new pair; failed captures invalidate it. Lost on restart. */
    //% blockId=science_soil_calibrate block="soil moisture pin $pin calibrate $reference" group="Analog"
    //% pin.defl=ScienceAnalogPin.P1
    export function calibrateSoil(pin: ScienceAnalogPin, reference: ScienceSoilReference): void {
        let index = soilPins.indexOf(pin)
        if (index < 0) { index = soilPins.length; soilPins.push(pin); soilDry.push(-1); soilWet.push(-1) }
        if (reference == 0 || reference != 1) { soilDry[index] = -1; soilWet[index] = -1 }
        else soilWet[index] = -1
        if (reference != 0 && reference != 1) return
        let raw = scienceInternal.calibrationAnalog(pin)
        if (raw <= 0 || raw >= 1023) return
        if (reference == 0) soilDry[index] = raw
        else soilWet[index] = raw
    }
    /** Relative scale between your dry soil (0) and wet soil (100), not true water percentage. Missing calibration, saturation, unstable reference or outside the two endpoints=-1. */
    //% blockId=science_soil_percent block="soil moisture pin $pin relative moisture (percent)" group="Analog"
    //% pin.defl=ScienceAnalogPin.P1
    export function soilMoisturePercent(pin: ScienceAnalogPin): number {
        let index = soilPins.indexOf(pin)
        if (index < 0 || soilDry[index] < 0 || soilWet[index] < 0 || Math.abs(soilWet[index] - soilDry[index]) < 20) return -1
        let raw = scienceInternal.analog(pin)
        if (raw <= 0 || raw >= 1023) return -1
        let value = (raw - soilDry[index]) * 100 / (soilWet[index] - soilDry[index])
        return value >= 0 && value <= 100 ? value : -1
    }
}
namespace scienceMotion {
    let weightZero = -1
    let weightReference = 0
    let weightCounts = 0
    function captureWeight(): number {
        let sum = 0, low = 65535, high = 0
        for (let i = 0; i < 16; i++) {
            let value = weight()
            if (value < 0 || value >= 65535) return -1
            sum += value; low = Math.min(low, value); high = Math.max(high, value)
            basic.pause(20)
        }
        return high - low <= Math.max(5, sum / 16 * 0.02) ? sum / 16 : -1
    }
    /** Empty the plate (or leave only the container), then capture its stable zero. Software tare only; no undocumented command is sent to the module. Recalibrate a known mass afterward. Lost on restart. */
    //% blockId=science_weight_zero block="weight sensor empty plate zero" group="Weight"
    export function zeroWeight(): void { weightCounts = 0; weightReference = 0; weightZero = captureWeight() }
    /** After zeroing, place a known mass within the module capacity. Use it as the upper end of the experiment. Failed calibration clears the old scale. Lost on restart. */
    //% blockId=science_weight_calibrate block="weight sensor calibrate reference $grams g" group="Weight"
    //% grams.defl=100 grams.min=0.1
    export function calibrateWeight(grams: number): void {
        weightCounts = 0; weightReference = 0
        if (weightZero < 0 || !scienceInternal.finite(grams) || grams <= 0) return
        let raw = captureWeight()
        if (raw < 0 || raw - weightZero < 5) return
        weightCounts = raw - weightZero; weightReference = grams
    }
    /** Software-calibrated mass between the empty plate and the known mass. Does not change the module reading block. Missing calibration, saturated/bad data or outside that interval=-1. */
    //% blockId=science_weight_grams block="weight sensor mass (g)" group="Weight"
    export function weightGrams(): number {
        if (weightCounts <= 0) return -1
        let raw = weight()
        if (raw < 0 || raw >= 65535) return -1
        let grams = (raw - weightZero) * weightReference / weightCounts
        return grams >= 0 && grams <= weightReference ? grams : -1
    }
}
