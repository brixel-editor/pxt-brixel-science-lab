enum ScienceAnalogPin {
    //% block="P0"
    P0 = AnalogPin.P0,
    //% block="P1"
    P1 = AnalogPin.P1,
    //% block="P2"
    P2 = AnalogPin.P2,
    //% block="P3 (LED off)"
    P3 = AnalogPin.P3,
    //% block="P4 (LED off)"
    P4 = AnalogPin.P4,
    //% block="P10 (LED off)"
    P10 = AnalogPin.P10
}
enum ScienceDigitalPin {
    //% block="P0"
    P0 = DigitalPin.P0,
    //% block="P1"
    P1 = DigitalPin.P1,
    //% block="P2"
    P2 = DigitalPin.P2,
    //% block="P8"
    P8 = DigitalPin.P8,
    //% block="P9"
    P9 = DigitalPin.P9,
    //% block="P12"
    P12 = DigitalPin.P12,
    //% block="P13"
    P13 = DigitalPin.P13,
    //% block="P14"
    P14 = DigitalPin.P14,
    //% block="P15"
    P15 = DigitalPin.P15,
    //% block="P16"
    P16 = DigitalPin.P16
}
/** Internal shared pin handling. Pin values are the core enum values, not connector column numbers. */
namespace scienceInternal {
    export function validDigital(pin: number): boolean {
        return pin == DigitalPin.P0 || pin == DigitalPin.P1 || pin == DigitalPin.P2 ||
            pin == DigitalPin.P8 || pin == DigitalPin.P9 || pin == DigitalPin.P12 ||
            pin == DigitalPin.P13 || pin == DigitalPin.P14 || pin == DigitalPin.P15 || pin == DigitalPin.P16
    }
    export function prepare(pin: number): void {
        if (pin == DigitalPin.P0) pins.setAudioPinEnabled(false)
        if (pin == DigitalPin.P3 || pin == DigitalPin.P4 || pin == DigitalPin.P10) led.enable(false)
    }
    export function analog(pin: ScienceAnalogPin): number {
        if (pin != ScienceAnalogPin.P0 && pin != ScienceAnalogPin.P1 && pin != ScienceAnalogPin.P2 &&
            pin != ScienceAnalogPin.P3 && pin != ScienceAnalogPin.P4 && pin != ScienceAnalogPin.P10) return -1
        prepare(pin)
        return pins.analogReadPin(<AnalogPin><number>pin)
    }
    export function digital(pin: ScienceDigitalPin): number {
        if (pin != ScienceDigitalPin.P0 && pin != ScienceDigitalPin.P1 && pin != ScienceDigitalPin.P2 &&
            pin != ScienceDigitalPin.P8 && pin != ScienceDigitalPin.P9 && pin != ScienceDigitalPin.P12 &&
            pin != ScienceDigitalPin.P13 && pin != ScienceDigitalPin.P14 && pin != ScienceDigitalPin.P15 && pin != ScienceDigitalPin.P16) return -1
        prepare(pin)
        return pins.digitalReadPin(<DigitalPin><number>pin)
    }
    // Display blocks accept text or numbers. Non-integer numbers are rounded to 2 decimals to fit a 16-character LCD line.
    export function displayText(value: any): string {
        if (typeof value == "number") {
            let n = <number>value
            if (finite(n) && n != Math.floor(n)) n = Math.round(n * 100) / 100
            return "" + n
        }
        return "" + value
    }
    export function finite(value: number): boolean {
        return value == value && value - value == 0
    }
    // A short stable capture for calibration, not an accuracy specification or a long settling wait.
    export function calibrationAnalog(pin: ScienceAnalogPin): number {
        let sum = 0, low = 1023, high = 0
        for (let i = 0; i < 16; i++) {
            let raw = analog(pin)
            if (!finite(raw) || raw < 0 || raw > 1023) return -1
            sum += raw; low = Math.min(low, raw); high = Math.max(high, raw)
            basic.pause(5)
        }
        return high - low <= 20 ? sum / 16 : -1
    }
}


