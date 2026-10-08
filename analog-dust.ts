namespace scienceAir {
    let dustBusy = false
    let dustLastAt = -100
    /** A_016/017/018 Sharp-style analog dust kit: VO to a protected ADC pin, LED control to a digital pin. Needs 5V sensor power, VO voltage scaling and a voltage-compatible LED driver. Mean of 8 pulses, raw 0..1023, not PM2.5 or ug/m3. Timing/ADC streaming conflict=-1. */
    //% blockId=science_analog_dust block="analog dust sensor signal $signal LED $lamp raw value" group="Analog particulate matter"
    //% signal.defl=ScienceAnalogPin.P1 lamp.defl=ScienceDigitalPin.P8
    export function analogDust(signal: ScienceAnalogPin, lamp: ScienceDigitalPin): number {
        if (!scienceInternal.validDigital(lamp) || <number>signal == <number>lamp ||
            (signal != ScienceAnalogPin.P0 && signal != ScienceAnalogPin.P1 && signal != ScienceAnalogPin.P2 &&
             signal != ScienceAnalogPin.P3 && signal != ScienceAnalogPin.P4 && signal != ScienceAnalogPin.P10)) return -1
        while (dustBusy) basic.pause(1)
        dustBusy = true
        scienceInternal.prepare(signal); scienceInternal.prepare(lamp)
        let sum = 0
        let valid = true
        for (let i = 0; i < 8; i++) {
            let wait = 10 - (control.millis() - dustLastAt)
            if (wait > 0) basic.pause(wait)
            dustLastAt = control.millis()
            let sample = scienceNative.sampleDust(signal, lamp)
            if (sample < 0 || sample > 1023) { valid = false; break }
            sum += sample
        }
        dustBusy = false
        return valid ? Math.round(sum / 8) : -1
    }
}
