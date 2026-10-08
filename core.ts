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
    export function finite(value: number): boolean {
        return value == value && value - value == 0
    }
}


